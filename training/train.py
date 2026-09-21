"""Core training pipeline script for LayoutLMv3 fine-tuning."""
import os
import sys
import logging

# Ensure project root is in python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from transformers import (

    LayoutLMv3Processor,
    LayoutLMv3ForTokenClassification,
    TrainingArguments,
    Trainer,
    default_data_collator
)

from training import config
from training.label_encoder import get_label_maps, export_label_map
from training.dataset_loader import build_hf_datasets, get_mapping_function
from training.utils import compute_metrics

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("LayoutLMv3Train")


from collections import Counter
import torch
import torch.nn as nn


class WeightedTrainer(Trainer):
    """
    Custom Trainer that overrides compute_loss to use class-weighted CrossEntropyLoss.
    Prevents the dominant 'O' class from suppressing minority entity gradients.
    """
    def __init__(self, class_weights=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.class_weights = class_weights

    def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
        labels = inputs.get("labels")
        outputs = model(**inputs)
        logits = outputs.get("logits")
        
        if self.class_weights is not None:
            loss_fct = nn.CrossEntropyLoss(
                weight=self.class_weights.to(logits.device),
                ignore_index=-100
            )
            loss = loss_fct(logits.view(-1, self.model.config.num_labels), labels.view(-1))
        else:
            loss = outputs.loss
            
        return (loss, outputs) if return_outputs else loss


def main():
    logger.info("Starting LayoutLMv3 fine-tuning pipeline...")
    logger.info(f"Using device: {config.DEVICE.upper()}")
    
    # 1. Load label mappings
    label2id, id2label = get_label_maps()
    logger.info(f"Loaded {len(label2id)} classes for token classification.")
    
    # 2. Build processor & model
    logger.info(f"Loading pre-trained LayoutLMv3 weights from '{config.BASE_MODEL}'...")
    processor = LayoutLMv3Processor.from_pretrained(config.BASE_MODEL, apply_ocr=False)
    
    model = LayoutLMv3ForTokenClassification.from_pretrained(
        config.BASE_MODEL,
        num_labels=len(label2id),
        id2label=id2label,
        label2id=label2id,
        ignore_mismatched_sizes=True  # Allows classification head re-initialization if num_labels changed
    )
    model.to(config.DEVICE)
    
    # 3. Load and split datasets
    logger.info(f"Loading datasets from '{config.DATASET_DIR}'...")
    try:
        train_raw, val_raw = build_hf_datasets(
            dataset_dir=config.DATASET_DIR,
            train_split=config.TRAIN_SPLIT,
            seed=config.SEED
        )
    except Exception as e:
        logger.error(f"Failed to load dataset: {e}")
        return

    logger.info(f"Dataset summary — Train samples: {len(train_raw)}, Validation samples: {len(val_raw)}")
    
    # 4. Map & align annotations
    logger.info("Aligning token annotations with sub-token layout coordinates...")
    align_func = get_mapping_function(processor, max_length=config.MAX_LENGTH)
    
    # Remove original raw columns to leave only numerical tensor inputs
    column_names = train_raw.column_names
    
    train_dataset = train_raw.map(
        align_func,
        batched=True,
        remove_columns=column_names,
        desc="Tokenizing and aligning train set"
    )
    val_dataset = val_raw.map(
        align_func,
        batched=True,
        remove_columns=column_names,
        desc="Tokenizing and aligning validation set"
    )
    
    # Calculate class counts and dynamic capped weights from train_dataset
    label_counts = Counter()
    for sample in train_dataset:
        for lbl in sample["labels"]:
            if lbl != -100:
                label_counts[lbl] += 1

    total_tokens = sum(label_counts.values())
    num_classes = len(label2id)

    class_weights_list = []
    logger.info("=" * 60)
    logger.info("CLASS WEIGHT ASSIGNMENT FOR LOSS FUNCTION")
    logger.info("=" * 60)
    logger.info(f"{'ID':<4} {'Label':<30} {'Count':<8} {'Weight':<8}")
    logger.info("-" * 60)
    
    for i in range(num_classes):
        lbl_str = id2label[i]
        cnt = label_counts.get(i, 0)
        if cnt == 0:
            w = 10.0  # Safe cap for zero-count labels
        else:
            raw_w = total_tokens / (num_classes * cnt)
            w = max(0.15, min(10.0, float(raw_w)))
        class_weights_list.append(w)
        logger.info(f"{i:<4} {lbl_str:<30} {cnt:<8} {w:.4f}")
    logger.info("=" * 60)

    class_weights = torch.tensor(class_weights_list, dtype=torch.float32)

    # 5. Define Training Arguments
    training_args = TrainingArguments(
        output_dir=config.OUTPUT_DIR,
        num_train_epochs=config.EPOCHS,
        per_device_train_batch_size=config.BATCH_SIZE,
        per_device_eval_batch_size=config.BATCH_SIZE,
        gradient_accumulation_steps=2,
        learning_rate=config.LEARNING_RATE,
        weight_decay=config.WEIGHT_DECAY,
        eval_strategy="epoch",
        save_strategy="epoch",
        save_total_limit=2,
        load_best_model_at_end=True,
        metric_for_best_model="f1",  # Optimization objective (Maximize F1 score)
        greater_is_better=True,
        seed=config.SEED,
        dataloader_num_workers=0,  # Prevents multiprocessing issues in Colab / Windows environments
        logging_steps=10
    )
    
    # 6. Initialize Weighted Trainer
    trainer = WeightedTrainer(
        class_weights=class_weights,
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        compute_metrics=compute_metrics,
        data_collator=default_data_collator
    )
    
    # 7. Execute Training
    logger.info("Executing training loop (Weighted Trainer API)...")
    ckpt = None
    if os.path.exists(config.OUTPUT_DIR):
        ckpts = [os.path.join(config.OUTPUT_DIR, d) for d in os.listdir(config.OUTPUT_DIR) if d.startswith("checkpoint-")]
        if ckpts:
            ckpts.sort(key=lambda x: int(x.split("-")[-1]))
            ckpt = ckpts[-1]
            logger.info(f"Resuming training from latest checkpoint '{ckpt}'...")
            
    trainer.train(resume_from_checkpoint=ckpt)
    
    # 8. Export trained model and configs
    logger.info(f"Training finished! Exporting best model to '{config.BEST_MODEL_DIR}'...")
    trainer.save_model(config.BEST_MODEL_DIR)
    processor.save_pretrained(config.BEST_MODEL_DIR)
    
    # Save label_map.json helper alongside the weights for easy loading during inference
    map_path = export_label_map(config.BEST_MODEL_DIR)
    logger.info(f"Label map exported to {map_path}")
    logger.info("Training pipeline execution completed successfully!")


if __name__ == "__main__":
    main()
