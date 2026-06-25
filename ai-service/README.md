# LifeVault AI Service

## 📋 Overview

Python FastAPI microservice for AI-powered document intelligence features. Handles OCR extraction, document classification, and metadata extraction using DocTR and computer vision techniques.

## 🏗️ Architecture

```
ai-service/
├── app/
│   ├── api/              # API layer
│   │   ├── routes/       # FastAPI route handlers
│   │   └── dependencies.py  # Dependency injection
│   ├── core/             # Core configuration
│   │   ├── config.py     # Settings and environment
│   │   └── logging.py    # Logging configuration
│   ├── services/         # Business logic
│   │   ├── ocr_service.py        # OCR processing
│   │   ├── classification_service.py  # Document type classification
│   │   └── extraction_service.py      # Metadata extraction
│   ├── models/           # Data models
│   │   └── schemas.py    # Pydantic models
│   ├── utils/            # Utility functions
│   │   └── image_processing.py  # Image preprocessing
│   └── main.py           # FastAPI application entry
├── tests/                # Test files
├── requirements.txt      # Python dependencies
└── .env.example          # Environment template
```

## 🤖 AI Pipeline

```
Upload Document
     ↓
Image Preprocessing
     ↓
DocTR OCR
     ↓
Text Extraction
     ↓
Document Classification
     ↓
Metadata Extraction
     ↓
Return JSON Result
```

## 🛠️ Tech Stack

- **FastAPI** - Modern async Python web framework
- **DocTR** - Deep Learning OCR engine
- **OpenCV** - Image processing and computer vision
- **Pillow** - Python Imaging Library
- **Pydantic** - Data validation with type hints
- **Uvicorn** - ASGI server

### Future AI Libraries (Phase 2)
- **LayoutLMv3** - Document understanding transformer
- **HuggingFace Transformers** - Pre-trained models
- **scikit-learn** - Machine learning utilities

## 🚀 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check endpoint |
| POST | `/ocr/extract` | Extract text from document |
| POST | `/classify` | Classify document type |
| POST | `/extract-metadata` | Extract structured metadata |
| POST | `/process` | Full pipeline (OCR + classify + extract) |

## 🔧 Getting Started

### Prerequisites
- Python 3.9 or higher
- pip

### Installation
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Setup Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Running the Service
```bash
# Development (with auto-reload)
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

Service runs at `http://localhost:8000`

API Documentation (auto-generated) at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Run Tests
```bash
pytest
```

## 📚 Libraries Explained

### DocTR
- Deep Learning-based OCR
- State-of-the-art text detection and recognition
- Supports multiple languages
- End-to-end trainable architecture

### OpenCV
- Image preprocessing (deskewing, noise reduction)
- Contour detection for document boundaries
- Adaptive thresholding for better OCR

### Pillow (PIL)
- Image format conversion
- Basic transformations (resize, rotate, crop)
- Color space manipulations

## 🔐 Security

- API key authentication (to be implemented)
- File type validation
- File size limits
- Input sanitization

---

**Status:** Foundation phase completed
