"""Utility functions and metrics calculation for LayoutLMv3 training."""
import evaluate
import numpy as np
from training.label_encoder import ID2LABEL

# Load the standard sequence-labeling metric (seqeval)
# seqeval automatically parses BIO tags to evaluate segment-level extraction.
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
    
    return {
        "precision": results["overall_precision"],
        "recall": results["overall_recall"],
        "f1": results["overall_f1"],
        "accuracy": results["overall_accuracy"],
    }
