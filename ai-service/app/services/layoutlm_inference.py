"""
ai-service/app/services/layoutlm_inference.py
=============================================
Inference service for local fine-tuned LayoutLMv3 model.
Loads the model lazily, handles normalization, predicts BIO labels,
merges predictions, and calculates confidence scores.
"""

import os
import time
import logging
import psutil
import torch
from PIL import Image
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class LayoutLMv3InferenceService:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(LayoutLMv3InferenceService, cls).__new__(cls, *args, **kwargs)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.model = None
        self.processor = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        # Resolved relative to this file: app/services/../../models/layoutlmv3
        self.model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "models", "layoutlmv3"))
        self.loading_metrics = {}
        self._initialized = True

    def _load_model(self):
        """Loads the model and processor lazily, capturing metrics."""
        if self.model is not None:
            return

        logger.info(f"Lazy loading LayoutLMv3 from local path: {self.model_dir} on {self.device}...")
        process = psutil.Process(os.getpid())
        
        ram_before = process.memory_info().rss / (1024 * 1024)
        cpu_time_before = process.cpu_times().user + process.cpu_times().system
        start_time = time.time()

        from transformers import LayoutLMv3Processor, LayoutLMv3ForTokenClassification

        self.processor = LayoutLMv3Processor.from_pretrained(self.model_dir, apply_ocr=False)
        self.model = LayoutLMv3ForTokenClassification.from_pretrained(self.model_dir)
        self.model.to(self.device)
        self.model.eval()

        end_time = time.time()
        ram_after = process.memory_info().rss / (1024 * 1024)
        cpu_time_after = process.cpu_times().user + process.cpu_times().system

        self.loading_metrics = {
            "load_time_seconds": round(end_time - start_time, 3),
            "ram_allocated_mb": round(ram_after - ram_before, 3),
            "cpu_time_seconds": round(cpu_time_after - cpu_time_before, 3),
            "device": self.device
        }

        logger.info(
            f"LayoutLMv3 model loaded in {self.loading_metrics['load_time_seconds']}s on {self.device}. "
            f"RAM allocated: {self.loading_metrics['ram_allocated_mb']:.2f} MB. "
            f"CPU time: {self.loading_metrics['cpu_time_seconds']:.2f}s."
        )

    def predict(self, image: Image.Image, words: List[str], boxes: List[List[int]]) -> Dict[str, dict]:
        """
        Runs token classification inference using LayoutLMv3.
        
        Args:
            image: PIL Image of the first page.
            words: List of OCR word strings on the first page.
            boxes: Bounding boxes [x0, y0, x1, y1] in raw image coordinates.
            
        Returns:
            A dictionary mapping Pydantic schema field names to values and confidence scores.
            E.g. {"holderName": {"value": "John Doe", "confidence": 0.98}, ...}
        """
        self._load_model()
        
        if not words:
            logger.info("Empty words list received for LayoutLMv3 inference, returning empty results.")
            return {}

        start_time = time.time()
        process = psutil.Process(os.getpid())
        ram_before = process.memory_info().rss / (1024 * 1024)

        # 1. Normalize boxes to 0-1000 scale
        width, height = image.size
        normalized_boxes = []
        for box in boxes:
            if len(box) != 4:
                box = [0, 0, 0, 0]
            x0, y0, x1, y1 = box
            
            nx0 = max(0, min(1000, int(1000 * x0 / width)))
            ny0 = max(0, min(1000, int(1000 * y0 / height)))
            nx1 = max(0, min(1000, int(1000 * x1 / width)))
            ny1 = max(0, min(1000, int(1000 * y1 / height)))
            
            if nx0 > nx1:
                nx0, nx1 = nx1, nx0
            if ny0 > ny1:
                ny0, ny1 = ny1, ny0
                
            normalized_boxes.append([nx0, ny0, nx1, ny1])

        # 2. Tokenize and prepare input tensors
        encoding = self.processor(
            image.convert("RGB"),
            words,
            boxes=normalized_boxes,
            return_tensors="pt",
            padding="max_length",
            truncation=True
        )

        inputs = {k: v.to(self.device) for k, v in encoding.items()}

        # 3. Model Forward Pass
        with torch.no_grad():
            outputs = self.model(**inputs)

        # 4. Process predictions
        probs = torch.softmax(outputs.logits.squeeze(0), dim=-1).cpu().numpy()  # [seq_len, num_labels]
        predictions = probs.argmax(-1)  # [seq_len]
        
        # Map subword token predictions back to original words list using word_ids
        word_ids = encoding.word_ids(batch_index=0)
        
        word_predictions = ["O"] * len(words)
        word_confidences = [0.0] * len(words)
        seen_words = set()
        
        for seq_idx, w_idx in enumerate(word_ids):
            if w_idx is None:
                continue
            if w_idx in seen_words:
                continue
            seen_words.add(w_idx)
            
            pred_id = predictions[seq_idx]
            label = self.model.config.id2label[pred_id]
            prob = probs[seq_idx][pred_id]
            
            word_predictions[w_idx] = label
            word_confidences[w_idx] = float(prob)

        # 5. BIO auto-correction to fix isolated/invalid "I-" tags
        prev_label = "O"
        for i in range(len(words)):
            lbl = word_predictions[i]
            if lbl.startswith("I-"):
                ent = lbl[2:]
                if prev_label not in (f"B-{ent}", f"I-{ent}"):
                    word_predictions[i] = f"B-{ent}"
            prev_label = word_predictions[i]

        # 6. Merge consecutive BIO tags into entities
        entities = {}
        current_entity = None
        current_words = []
        current_confs = []
        
        def save_entity(entity_type, w_list, c_list):
            # Mapping model's entity label suffix to LifeVault's Pydantic schema field names
            mapping = {
                "HOLDER_NAME": "holderName",
                "DOCUMENT_NUMBER": "documentNumber",
                "DOCUMENT_TITLE": "documentName",
                "ISSUE_DATE": "issueDate",
                "EXPIRY_DATE": "expiryDate",
                "ORGANIZATION": "organization"
            }
            schema_field = mapping.get(entity_type)
            if not schema_field:
                return
                
            val = " ".join(w_list).strip()
            conf = sum(c_list) / len(c_list) if c_list else 0.0
            
            # If the entity type was matched multiple times, keep the higher confidence prediction
            if schema_field in entities:
                if conf > entities[schema_field]["confidence"]:
                    entities[schema_field] = {"value": val, "confidence": round(conf, 4)}
            else:
                entities[schema_field] = {"value": val, "confidence": round(conf, 4)}

        for i, (word, pred, conf) in enumerate(zip(words, word_predictions, word_confidences)):
            if pred.startswith("B-"):
                if current_entity:
                    save_entity(current_entity, current_words, current_confs)
                current_entity = pred[2:]
                current_words = [word]
                current_confs = [conf]
            elif pred.startswith("I-") and current_entity == pred[2:]:
                current_words.append(word)
                current_confs.append(conf)
            else:
                if current_entity:
                    save_entity(current_entity, current_words, current_confs)
                    current_entity = None
                    current_words = []
                    current_confs = []
                    
        if current_entity:
            save_entity(current_entity, current_words, current_confs)

        end_time = time.time()
        ram_after = process.memory_info().rss / (1024 * 1024)
        inference_time = round(end_time - start_time, 3)
        ram_allocated = round(ram_after - ram_before, 3)

        # 7. Structured Logging
        logger.info(
            f"[LayoutLMv3 Prediction SUCCESS] "
            f"Inference Time: {inference_time}s | "
            f"Device: {self.device} | "
            f"RAM Allocated: {ram_allocated:.2f} MB | "
            f"Extracted Entities: { {k: v['value'] for k, v in entities.items()} } | "
            f"Confidence Scores: { {k: v['confidence'] for k, v in entities.items()} }"
        )

        return entities

layoutlm_inference_service = LayoutLMv3InferenceService()
