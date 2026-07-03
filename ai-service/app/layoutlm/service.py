"""LayoutLMv3 Feasibility Service with Resource Instrumentation."""
import os
import time
import logging
import psutil
from PIL import Image
import torch

logger = logging.getLogger(__name__)


class LayoutLMv3Service:
    def __init__(self, model_name: str = "nielsr/layoutlmv3-finetuned-funsd"):
        self.model_name = model_name
        self.processor = None
        self.model = None
        self.device = "cpu"
        self.loading_metrics = {}

    def load_model(self):
        """Loads LayoutLMv3 processor and model weights, measuring load time, RAM, and CPU usage."""
        if self.model is not None:
            return self.loading_metrics

        logger.info(f"Loading LayoutLMv3 weights for '{self.model_name}' on {self.device}...")
        
        process = psutil.Process(os.getpid())
        
        # Initial stats
        ram_before = process.memory_info().rss / (1024 * 1024)
        cpu_time_before = process.cpu_times().user + process.cpu_times().system
        start_time = time.time()

        # Load from Hugging Face
        from transformers import LayoutLMv3Processor, LayoutLMv3ForTokenClassification
        
        # Load processor (apply_ocr=False is critical so it doesn't search for local tesseract)
        self.processor = LayoutLMv3Processor.from_pretrained(self.model_name, apply_ocr=False)
        # Load model
        self.model = LayoutLMv3ForTokenClassification.from_pretrained(self.model_name)
        self.model.to(self.device)
        self.model.eval()

        # Final stats
        end_time = time.time()
        ram_after = process.memory_info().rss / (1024 * 1024)
        cpu_time_after = process.cpu_times().user + process.cpu_times().system

        self.loading_metrics = {
            "model_name": self.model_name,
            "load_time_seconds": round(end_time - start_time, 3),
            "ram_allocated_mb": round(ram_after - ram_before, 3),
            "ram_total_mb": round(ram_after, 3),
            "cpu_time_seconds": round(cpu_time_after - cpu_time_before, 3),
        }

        logger.info(
            f"LayoutLMv3 loaded successfully in {self.loading_metrics['load_time_seconds']}s. "
            f"RAM allocated: {self.loading_metrics['ram_allocated_mb']:.2f} MB (Total: {self.loading_metrics['ram_total_mb']:.2f} MB). "
            f"CPU time: {self.loading_metrics['cpu_time_seconds']:.2f}s."
        )
        return self.loading_metrics

    def run_inference(self, image: Image.Image, words: list[str], boxes: list[list[int]]):
        """
        Runs LayoutLMv3 token classification inference.
        Normalizes boxes, processes input tensors, performs forward pass, and measures resources.
        
        Boxes must be [x0, y0, x1, y1] in raw image pixel scale.
        """
        # Ensure model is loaded (with metrics captured)
        load_metrics = self.load_model()

        logger.info(f"Running LayoutLMv3 inference on image with {len(words)} words...")
        process = psutil.Process(os.getpid())
        
        # Initial stats
        ram_before = process.memory_info().rss / (1024 * 1024)
        cpu_time_before = process.cpu_times().user + process.cpu_times().system
        start_time = time.time()

        # 1. Normalize boxes to 0-1000 scale
        width, height = image.size
        normalized_boxes = []
        
        # Fallback if no words provided
        if not words:
            words = [""]
            boxes = [[0, 0, 0, 0]]
            
        for i, box in enumerate(boxes):
            if len(box) != 4:
                box = [0, 0, 0, 0]
            x0, y0, x1, y1 = box
            
            # Scale coordinates to 0-1000
            nx0 = max(0, min(1000, int(1000 * x0 / width)))
            ny0 = max(0, min(1000, int(1000 * y0 / height)))
            nx1 = max(0, min(1000, int(1000 * x1 / width)))
            ny1 = max(0, min(1000, int(1000 * y1 / height)))
            
            # LayoutLMv3 requires x0 <= x1 and y0 <= y1
            if nx0 > nx1:
                nx0, nx1 = nx1, nx0
            if ny0 > ny1:
                ny0, ny1 = ny1, ny0
                
            normalized_boxes.append([nx0, ny0, nx1, ny1])

        # 2. Process features (disable automatic OCR since we provide text/bboxes)
        encoding = self.processor(
            image.convert("RGB"),
            words,
            boxes=normalized_boxes,
            return_tensors="pt",
            padding="max_length",
            truncation=True
        )

        # Move tensors to correct device
        inputs = {k: v.to(self.device) for k, v in encoding.items()}

        # 3. Model Forward Pass
        with torch.no_grad():
            outputs = self.model(**inputs)

        # Final stats
        end_time = time.time()
        ram_after = process.memory_info().rss / (1024 * 1024)
        cpu_time_after = process.cpu_times().user + process.cpu_times().system

        # 4. Process predictions
        logits = outputs.logits.squeeze(0).cpu().numpy()  # [seq_len, num_labels]
        predictions = logits.argmax(-1).tolist()  # [seq_len]
        logits_list = logits.tolist()

        # Map predictions to labels
        id2label = self.model.config.id2label
        predicted_labels = [id2label[p] for p in predictions]
        
        # Get input tokens to match with labels
        input_ids = encoding["input_ids"].squeeze(0).tolist()
        tokens = self.processor.tokenizer.convert_ids_to_tokens(input_ids)

        inference_metrics = {
            "inference_time_seconds": round(end_time - start_time, 3),
            "ram_allocated_mb": round(ram_after - ram_before, 3),
            "ram_total_mb": round(ram_after, 3),
            "cpu_time_seconds": round(cpu_time_after - cpu_time_before, 3),
        }

        logger.info(
            f"LayoutLMv3 inference completed in {inference_metrics['inference_time_seconds']}s. "
            f"RAM allocated: {inference_metrics['ram_allocated_mb']:.2f} MB (Total: {inference_metrics['ram_total_mb']:.2f} MB)."
        )

        return {
            "logits": logits_list,
            "predictions": predictions,
            "predicted_labels": predicted_labels,
            "tokens": tokens,
            "metrics": {
                "loading": load_metrics,
                "inference": inference_metrics
            }
        }


layoutlm_service = LayoutLMv3Service()
