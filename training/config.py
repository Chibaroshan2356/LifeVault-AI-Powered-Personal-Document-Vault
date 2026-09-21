"""Training configuration parameters for LayoutLMv3 fine-tuning."""
import os
import torch

# Base Model Selection
# "nielsr/layoutlmv3-finetuned-funsd" is fine-tuned on FUNSD (key-value labeling) and is a great starting point.
# For generic training from base weights, use "microsoft/layoutlmv3-base".
BASE_MODEL = "nielsr/layoutlmv3-finetuned-funsd"

# Hyperparameters
EPOCHS = 5
BATCH_SIZE = 4
LEARNING_RATE = 7e-5
WEIGHT_DECAY = 0.01
MAX_LENGTH = 512
SEED = 42
TRAIN_SPLIT = 0.8  # 80% train, 20% validation

# Paths
DATASET_DIR = "dataset"
OUTPUT_DIR = os.path.join("training", "models", "layoutlmv3-lifevault", "experiment_2")
BEST_MODEL_DIR = os.path.join(OUTPUT_DIR, "best")

# Device configuration (automatically handles CPU/GPU)
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
