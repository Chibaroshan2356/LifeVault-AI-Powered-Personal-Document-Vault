"""Dataset loader and token-level label alignment module for LayoutLMv3."""
import os
import json
import logging
from PIL import Image
from sklearn.model_selection import train_test_split
from datasets import Dataset
from training.label_encoder import LABEL2ID

logger = logging.getLogger(__name__)

CATEGORIES = [
    "resume", "passport", "pan", "aadhaar", "student_id",
    "certificates", "internship", "fee_receipts", "medical", "insurance"
]


def load_raw_dataset(dataset_dir="dataset"):
    """
    Traverses the dataset directory structure, loading images and annotations.
    Returns a list of dicts: {"image_path": str, "words": List[str], "boxes": List[List[int]], "labels": List[str]}
    """
    data_items = []
    
    for cat in CATEGORIES:
        cat_dir = os.path.join(dataset_dir, cat)
        labels_dir = os.path.join(cat_dir, "labels")
        images_dir = os.path.join(cat_dir, "images")
        
        if not os.path.exists(labels_dir):
            continue
            
        for file in os.listdir(labels_dir):
            if not file.endswith(".json") or file == "schema.json":
                continue
                
            label_path = os.path.join(labels_dir, file)
            try:
                with open(label_path, "r") as f:
                    annotation = json.load(f)
                
                image_filename = annotation.get("image_filename")
                if not image_filename:
                    logger.warning(f"No image filename defined in {label_path}")
                    continue
                    
                image_path = os.path.join(images_dir, image_filename)
                if not os.path.exists(image_path):
                    logger.warning(f"Image {image_path} not found for label {label_path}")
                    continue
                
                words = []
                boxes = []
                labels = []
                
                for word_entry in annotation.get("words", []):
                    words.append(word_entry["text"])
                    boxes.append(word_entry["box"])
                    labels.append(word_entry["label"])
                
                if words:
                    data_items.append({
                        "image_path": image_path,
                        "words": words,
                        "boxes": boxes,
                        "labels": labels
                    })
            except Exception as e:
                logger.error(f"Failed to load annotation {label_path}: {e}")
                
    logger.info(f"Loaded {len(data_items)} valid annotated documents across {len(CATEGORIES)} categories.")
    return data_items


def build_hf_datasets(dataset_dir="dataset", train_split=0.8, seed=42):
    """
    Loads raw dataset, splits it into train/validation, and returns HF Dataset objects.
    """
    raw_data = load_raw_dataset(dataset_dir)
    if not raw_data:
        raise ValueError(f"No valid training data found in {dataset_dir}")
        
    if len(raw_data) > 1:
        train_items, val_items = train_test_split(raw_data, train_size=train_split, random_state=seed)
    else:
        logger.warning("Only 1 sample found, duplicating for validation to prevent pipeline crash.")
        train_items = raw_data
        val_items = raw_data
        
    def list_of_dicts_to_dict_of_lists(items):
        return {
            "image_path": [x["image_path"] for x in items],
            "words": [x["words"] for x in items],
            "boxes": [x["boxes"] for x in items],
            "labels": [x["labels"] for x in items]
        }
        
    train_dataset = Dataset.from_dict(list_of_dicts_to_dict_of_lists(train_items))
    val_dataset = Dataset.from_dict(list_of_dicts_to_dict_of_lists(val_items))
    
    return train_dataset, val_dataset


def get_mapping_function(processor, max_length=512):
    """
    Returns a Hugging Face map function to tokenize, normalize bounding boxes, and align labels.
    """
    def align_and_process(examples):
        image_paths = examples["image_path"]
        words_batch = examples["words"]
        boxes_batch = examples["boxes"]
        labels_batch = examples["labels"]
        
        images = []
        for path in image_paths:
            images.append(Image.open(path).convert("RGB"))
            
        normalized_boxes_batch = []
        for i, boxes in enumerate(boxes_batch):
            img = images[i]
            w, h = img.size
            norm_boxes = []
            for box in boxes:
                # box format is [x0, y0, x1, y1]
                nx0 = max(0, min(1000, int(1000 * box[0] / w)))
                ny0 = max(0, min(1000, int(1000 * box[1] / h)))
                nx1 = max(0, min(1000, int(1000 * box[2] / w)))
                ny1 = max(0, min(1000, int(1000 * box[3] / h)))
                
                # Sanity sorting
                if nx0 > nx1:
                    nx0, nx1 = nx1, nx0
                if ny0 > ny1:
                    ny0, ny1 = ny1, ny0
                norm_boxes.append([nx0, ny0, nx1, ny1])
            normalized_boxes_batch.append(norm_boxes)
            
        # Run processor (apply_ocr=False is set to pass our pre-computed words and boxes)
        encodings = processor(
            images,
            words_batch,
            boxes=normalized_boxes_batch,
            truncation=True,
            padding="max_length",
            max_length=max_length,
            return_tensors="pt"
        )
        
        # Align labels
        aligned_labels_batch = []
        for i, word_labels in enumerate(labels_batch):
            word_ids = encodings.word_ids(batch_index=i)
            previous_word_idx = None
            label_ids = []
            
            for word_idx in word_ids:
                if word_idx is None:
                    # Special tokens get -100
                    label_ids.append(-100)
                elif word_idx != previous_word_idx:
                    # First sub-token gets the BIO entity ID
                    label_str = word_labels[word_idx]
                    label_ids.append(LABEL2ID.get(label_str, 0))
                else:
                    # Subsequent sub-tokens of a word get -100
                    label_ids.append(-100)
                previous_word_idx = word_idx
                
            aligned_labels_batch.append(label_ids)
            
        result = {k: v.numpy().tolist() if hasattr(v, "numpy") else v for k, v in encodings.items()}
        result["labels"] = aligned_labels_batch
        return result
        
    return align_and_process
