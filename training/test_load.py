import os
import sys
import logging

# Ensure project root is in python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from transformers import LayoutLMv3Processor
from training.dataset_loader import build_hf_datasets, get_mapping_function
from training.label_encoder import ID2LABEL

logging.basicConfig(level=logging.INFO)


def test():
    print("Loading processor...")
    processor = LayoutLMv3Processor.from_pretrained("nielsr/layoutlmv3-finetuned-funsd", apply_ocr=False)
    
    print("Building datasets...")
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    dataset_dir = os.path.join(repo_root, "dataset")
    train, val = build_hf_datasets(dataset_dir=dataset_dir)
    
    print(f"Loaded train dataset with {len(train)} items.")
    
    print("Mapping and aligning first item...")
    align_func = get_mapping_function(processor)
    # Map the first example
    mapped = train.select([0]).map(align_func, batched=True)
    
    input_ids = mapped[0]["input_ids"]
    labels = mapped[0]["labels"]
    
    tokens = processor.tokenizer.convert_ids_to_tokens(input_ids)
    
    print("\nAligned Tokens & Labels:")
    print("=" * 60)
    # Print first 30 aligned tokens and their labels
    for idx, (token, label_id) in enumerate(zip(tokens[:30], labels[:30])):
        token_str = token.encode("ascii", errors="backslashreplace").decode("ascii")
        label_str = ID2LABEL.get(label_id, label_id) if label_id != -100 else "-100 (IGNORED)"
        print(f"Token {idx+1:02d}: {token_str:<25} => Label: {label_str}")
    print("=" * 60)
    print("Dataset load and alignment verification succeeded!")


if __name__ == "__main__":
    test()
