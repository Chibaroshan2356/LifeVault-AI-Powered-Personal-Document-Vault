"""
ai-service/tests/test_layoutlm_inference.py
===========================================
Unit tests for LayoutLMv3InferenceService.
"""

import pytest
import os
import sys
from PIL import Image

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.layoutlm_inference import layoutlm_inference_service

def test_layoutlm_lazy_loading():
    """Verify that the model loads lazily and populates metrics."""
    # Ensure model is initialized but not yet loaded if we import it,
    # or if already loaded, verify it exists.
    assert layoutlm_inference_service.device in ["cpu", "cuda"]
    layoutlm_inference_service._load_model()
    assert layoutlm_inference_service.model is not None
    assert layoutlm_inference_service.processor is not None
    assert "load_time_seconds" in layoutlm_inference_service.loading_metrics


def test_layoutlm_prediction_structure():
    """Test inference on a dummy image and words to verify output schema."""
    dummy_img = Image.new("RGB", (300, 300), color="white")
    dummy_words = ["INCOME", "TAX", "DEPARTMENT", "RAHUL", "MISHRA"]
    dummy_boxes = [
        [10, 10, 50, 30],
        [60, 10, 100, 30],
        [110, 10, 200, 30],
        [10, 50, 70, 70],
        [80, 50, 150, 70]
    ]

    results = layoutlm_inference_service.predict(dummy_img, dummy_words, dummy_boxes)
    assert isinstance(results, dict)
    
    # Check that any returned entity matches the value/confidence schema
    for key, data in results.items():
        assert "value" in data
        assert "confidence" in data
        assert isinstance(data["value"], str)
        assert isinstance(data["confidence"], float)
        assert 0.0 <= data["confidence"] <= 1.0


def test_layoutlm_prediction_empty_input():
    """Test that predicting with empty lists returns an empty dict without crashing."""
    dummy_img = Image.new("RGB", (300, 300), color="white")
    results = layoutlm_inference_service.predict(dummy_img, [], [])
    assert results == {}
