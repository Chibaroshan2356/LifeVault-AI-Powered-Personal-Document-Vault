# LifeVault LayoutLMv3 Training Module

This directory contains the machine learning code modules for training and fine-tuning **LayoutLMv3** on the LifeVault document dataset.

---

## 1. Directory Structure

- `layoutlmv3_training.ipynb`: Google Colab Jupyter Notebook to configure runtime and invoke scripts.
- `train.py`: Entry point training loop script executing the Hugging Face `Trainer` API.
- `dataset_loader.py`: Parses the `dataset/` folder, creates `Dataset` objects, scales bounding boxes, and aligns tags to sub-tokens.
- `label_encoder.py`: Holds the global static BIO labels mapping (`id2label` / `label2id`) and serializes `label_map.json`.
- `config.py`: Controls model paths, hyperparameters (epochs, learning rate), splits, and devices.
- `utils.py`: Performs sequence-level metrics calculations (F1, Precision, Recall) using the `seqeval` library.
- `README.md`: This instruction guide.

---

## 2. Google Colab Execution Instructions

### Step 1: Upload the Workspace
Zip your project workspace (including the `dataset/` and `training/` directories) and upload it to your Google Drive (e.g. at `My Drive/LifeVault.zip`).

### Step 2: Open Notebook in Colab
1. Import [layoutlmv3_training.ipynb](file:///c:/Dev/LifeVault/LifeVault-AI-Powered-Personal-Document-Vault/training/layoutlmv3_training.ipynb) to Google Colab.
2. Select a GPU runtime: **Runtime > Change runtime type > T4 GPU**.

### Step 3: Run the Cells
1. **Verify GPU:** Check `nvidia-smi` output to ensure the GPU device is active.
2. **Install Packages:** Run the package installer cell to configure Hugging Face and PyTorch dependencies.
3. **Mount Drive:** Follow the prompt to authorize Google Drive access.
4. **Extract Project:** Unpack the project zip file inside Colab.
5. **Start Training:** Execute `!python training/train.py`.
   - The script will automatically discover and load the datasets, run training epochs, evaluate metric checkpoints, and save progress.
6. **Save Outputs:** Copy the exported weights folder back to your Drive.

---

## 3. Exported Model Artifacts
When training successfully concludes, the best checkpoint is exported to `training_outputs/best_model/` containing:

- **`model.safetensors`**: The fine-tuned weights of the LayoutLMv3 model.
- **`config.json`**: Model architecture configuration.
- **`tokenizer.json` / `tokenizer_config.json`**: Tokenizer vocabulary maps.
- **`label_map.json`**: Custom mapping dictionary containing `label2id` and `id2label` used to parse numeric predictions back to schema text fields during inference.
