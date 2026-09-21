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


def load_item_from_label_json(label_path, images_dir):
    try:
        with open(label_path, "r", encoding="utf-8") as f:
            annotation = json.load(f)
        image_filename = annotation.get("image_filename")
        if not image_filename:
            return None
        image_path = os.path.join(images_dir, image_filename)
        if not os.path.exists(image_path):
            return None
        words = []
        boxes = []
        labels = []
        for word_entry in annotation.get("words", []):
            words.append(word_entry["text"])
            boxes.append(word_entry["box"])
            labels.append(word_entry["label"])
        if words:
            return {"image_path": image_path, "words": words, "boxes": boxes, "labels": labels}
    except Exception as e:
        logger.error(f"Failed to load annotation {label_path}: {e}")
    return None


def build_hf_datasets(dataset_dir="dataset", train_split=0.8, seed=42):
    """
    Loads raw dataset, splits it into train/validation, and returns HF Dataset objects.
    Uses training/dataset_split.json manifest if present.
    """
    manifest_path = os.path.join("training", "dataset_split.json")
    if os.path.exists(manifest_path):
        logger.info(f"Loading enhanced split manifest from '{manifest_path}'...")
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)

        raw_map = {os.path.normpath(x["image_path"]): x for x in load_raw_dataset(dataset_dir)}

        train_items = []
        for p in manifest.get("train_image_paths", []):
            norm_p = os.path.normpath(p)
            if norm_p in raw_map:
                train_items.append(raw_map[norm_p])

        # Load augmented training items
        for p in manifest.get("aug_train_image_paths", []):
            norm_p = os.path.normpath(p)
            parts = norm_p.split(os.sep)
            cat = parts[-3]
            img_file = parts[-1]
            json_file = img_file.replace(".png", ".json")
            label_path = os.path.join(dataset_dir, "aug_train", cat, "labels", json_file)
            img_dir = os.path.join(dataset_dir, "aug_train", cat, "images")
            item = load_item_from_label_json(label_path, img_dir)
            if item:
                train_items.append(item)

        val_items = []
        for p in manifest.get("val_image_paths", []):
            norm_p = os.path.normpath(p)
            if norm_p in raw_map:
                val_items.append(raw_map[norm_p])

        logger.info(f"Loaded enhanced split — Train: {len(train_items)} samples (161 base + {len(train_items)-161} aug), Validation: {len(val_items)} samples (unaugmented).")
    else:
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


def build_hf_datasets_experiment3(dataset_dir="training/experiment_3_combined_dataset"):
    """
    Loads raw dataset for Experiment #3 from flat images/ and labels/ directories using dataset_split.json.
    Returns HF Dataset objects (train_dataset, val_dataset).
    """
    manifest_path = os.path.join(dataset_dir, "dataset_split.json")
    if not os.path.exists(manifest_path):
        raise FileNotFoundError(f"Manifest not found at '{manifest_path}'")
        
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)
        
    train_ids = manifest.get("train_ids", [])
    val_ids = manifest.get("val_ids", [])
    
    images_dir = os.path.join(dataset_dir, "images")
    labels_dir = os.path.join(dataset_dir, "labels")
    
    def load_doc_by_id(doc_id):
        json_path = os.path.join(labels_dir, f"{doc_id}.json")
        if not os.path.exists(json_path):
            logger.warning(f"Label JSON missing: {json_path}")
            return None
            
        with open(json_path, "r", encoding="utf-8") as f:
            annotation = json.load(f)
            
        img_filename = annotation.get("image_filename")
        if not img_filename or not os.path.exists(os.path.join(images_dir, img_filename)):
            img_filename = None
            for ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp"]:
                cand = f"{doc_id}{ext}"
                if os.path.exists(os.path.join(images_dir, cand)):
                    img_filename = cand
                    break
                
        if not img_filename:
            logger.warning(f"Image for doc_id '{doc_id}' not found in {images_dir}")
            return None
            
        image_path = os.path.join(images_dir, img_filename)
        words = []
        boxes = []
        labels = []
        for word_entry in annotation.get("words", []):
            words.append(word_entry["text"])
            boxes.append(word_entry["box"])
            labels.append(word_entry["label"])
            
        if words:
            return {
                "image_path": image_path,
                "words": words,
                "boxes": boxes,
                "labels": labels
            }
        return None

    train_items = []
    for doc_id in train_ids:
        item = load_doc_by_id(doc_id)
        if item:
            train_items.append(item)

    val_items = []
    for doc_id in val_ids:
        item = load_doc_by_id(doc_id)
        if item:
            val_items.append(item)

    logger.info(f"Loaded Exp3 Combined Dataset — Train: {len(train_items)} samples, Validation: {len(val_items)} samples.")

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
