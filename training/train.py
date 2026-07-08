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
    
    # 5. Define Training Arguments
    training_args = TrainingArguments(
        output_dir=config.OUTPUT_DIR,
        num_train_epochs=config.EPOCHS,
        per_device_train_batch_size=config.BATCH_SIZE,
        per_device_eval_batch_size=config.BATCH_SIZE,
        learning_rate=config.LEARNING_RATE,
        weight_decay=config.WEIGHT_DECAY,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        save_total_limit=2,
        load_best_model_at_end=True,
        metric_for_best_model="f1",  # Optimization objective (Maximize F1 score)
        greater_is_better=True,
        seed=config.SEED,
        dataloader_num_workers=0,  # Prevents multiprocessing issues in Colab / Windows environments
        logging_steps=10
    )
    
    # 6. Initialize Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        compute_metrics=compute_metrics,
        data_collator=default_data_collator
    )
    
    # 7. Execute Training
    logger.info("Executing training loop (Hugging Face Trainer API)...")
    trainer.train()
    
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
