"""Utility functions, metrics calculation, and BIO post-processing for LayoutLMv3."""
import evaluate
import numpy as np
from collections import defaultdict
from training.label_encoder import ID2LABEL

# Load the standard sequence-labeling metric (seqeval)
metric = evaluate.load("seqeval")


def compute_metrics(p):
    """
    Computes precision, recall, f1, and accuracy at token classification level.
    Ignores -100 labels (special tokens and sub-tokens).
    """
    predictions, labels = p
    predictions = np.argmax(predictions, axis=2)

    # Convert predictions and labels back to text BIO tags, filtering out -100
    true_predictions = [
        [ID2LABEL[p] for (p, l) in zip(prediction, label) if l != -100]
        for prediction, label in zip(predictions, labels)
    ]
    true_labels = [
        [ID2LABEL[l] for (p, l) in zip(prediction, label) if l != -100]
        for prediction, label in zip(predictions, labels)
    ]

    results = metric.compute(predictions=true_predictions, references=true_labels)
    
    # Calculate prediction distribution stats for diagnostic logging
    flat_preds = [p for prediction, label in zip(predictions, labels) for p, l in zip(prediction, label) if l != -100]
    total_valid = len(flat_preds)
    o_count = sum(1 for p in flat_preds if p == 0)
    entity_count = total_valid - o_count
    o_pct = (o_count / total_valid * 100.0) if total_valid > 0 else 0.0
    entity_pct = (entity_count / total_valid * 100.0) if total_valid > 0 else 0.0

    return {
        "precision": results["overall_precision"],
        "recall": results["overall_recall"],
        "f1": results["overall_f1"],
        "accuracy": results["overall_accuracy"],
        "pred_o_pct": o_pct,
        "pred_entity_pct": entity_pct,
    }


def reconstruct_entities_enhanced(words, boxes, predictions, confidences, min_conf=0.0, merge_consecutive_b=True):
    """
    Enhanced BIO entity reconstruction:
    1. Reconstructs complete entity spans.
    2. Optional consecutive B-TAG merging: If consecutive tokens are predicted as B-SAME_ENTITY
       with no O token or different entity type between them, merge them into one entity span.
    3. Preserves normal BIO behavior for B-TAG followed by I-TAG.
    4. Span-level confidence aggregation: Calculates average token confidence over complete span,
       filtering at entity level rather than dropping sub-tokens beforehand.
    """
    predicted_entities = defaultdict(list)
    current_entity = None
    current_words = []
    current_confs = []
    current_boxes = []

    for w, b, p_lbl, conf in zip(words, boxes, predictions, confidences):
        if p_lbl == "O":
            if current_entity and current_words:
                span_conf = float(np.mean(current_confs))
                if span_conf >= min_conf:
                    predicted_entities[current_entity].append({
                        "text": " ".join(current_words),
                        "confidence": span_conf,
                        "box": current_boxes[0]
                    })
            current_entity = None
            current_words = []
            current_confs = []
            current_boxes = []
        elif p_lbl.startswith("B-"):
            entity_type = p_lbl[2:]
            if merge_consecutive_b and current_entity == entity_type:
                # Merge consecutive B-TAG of SAME entity class!
                current_words.append(w)
                current_confs.append(conf)
                current_boxes.append(b)
            else:
                if current_entity and current_words:
                    span_conf = float(np.mean(current_confs))
                    if span_conf >= min_conf:
                        predicted_entities[current_entity].append({
                            "text": " ".join(current_words),
                            "confidence": span_conf,
                            "box": current_boxes[0]
                        })
                current_entity = entity_type
                current_words = [w]
                current_confs = [conf]
                current_boxes = [b]
        elif p_lbl.startswith("I-"):
            entity_type = p_lbl[2:]
            if current_entity == entity_type:
                current_words.append(w)
                current_confs.append(conf)
                current_boxes.append(b)
            else:
                if current_entity and current_words:
                    span_conf = float(np.mean(current_confs))
                    if span_conf >= min_conf:
                        predicted_entities[current_entity].append({
                            "text": " ".join(current_words),
                            "confidence": span_conf,
                            "box": current_boxes[0]
                        })
                if merge_consecutive_b:
                    current_entity = entity_type
                    current_words = [w]
                    current_confs = [conf]
                    current_boxes = [b]
                else:
                    current_entity = None
                    current_words = []
                    current_confs = []
                    current_boxes = []

    if current_entity and current_words:
        span_conf = float(np.mean(current_confs))
        if span_conf >= min_conf:
            predicted_entities[current_entity].append({
                "text": " ".join(current_words),
                "confidence": span_conf,
                "box": current_boxes[0]
            })

    return predicted_entities
