# LifeVault — AI-Powered Personal Document Vault

> A secure, intelligent document management system that stores, organises, and understands your personal documents using AI-powered OCR, automatic classification, and smart metadata extraction.

---

## Project Overview

LifeVault is a full-stack web application developed as a Final Year Project. It provides a centralised, secure vault for personal documents such as Aadhaar cards, PAN cards, passports, driving licences, educational certificates, employment records, medical reports, insurance documents, warranty cards, and bills.

The system automatically processes every uploaded document through an AI pipeline that extracts text via OCR, classifies the document type, extracts key metadata (holder name, document number, issue/expiry dates), and indexes the content for full-text search — all asynchronously in the background without blocking the user.

---

## Key Features

| Feature | Description |
|---------|-------------|
| 🔐 Secure Authentication | JWT access tokens + hashed refresh tokens stored in MongoDB |
| 📁 Document Upload | PDF, JPG, PNG support with drag-and-drop and real-time progress bar |
| 🤖 AI OCR Pipeline | EasyOCR for scanned images, PyMuPDF for digital PDFs |
| 🏷️ Auto-Classification | Rule-based classifier identifies 12 document types |
| 🔍 Smart Metadata Extraction | Extracts holder name, document number, issue date, expiry date |
| 🔎 Full-Text Search | Search within OCR text + metadata filters (category, status, date range, file size) |
| ⏰ Expiry Alerts | Dashboard highlights documents expiring within 30 days |
| 📊 Analytics Dashboard | Document counts, category breakdown, status breakdown, recent activity |
| 🗂️ Processing History | Immutable audit trail of every pipeline stage per document |
| 🧾 API Documentation | Interactive Swagger UI at `/api-docs` |

---

## Technology Stack

### Frontend
- **Angular 17** — Standalone components, no NgModules
- **Angular Material** — UI component library
- **TypeScript** — Type-safe implementation
- **RxJS** — Reactive HTTP and state management

### Backend
- **Node.js + Express** — REST API server
- **TypeScript** — Full type coverage
- **JWT** — Access token (15 min) + Refresh token (30 days)
- **Multer** — Multipart file upload handling
- **Zod** — Request schema validation
- **Helmet + CORS + Rate Limiting** — Security middleware
- **Swagger/OpenAPI** — API documentation
- **Winston + Morgan** — Structured logging
- **Jest + Supertest** — Unit and integration testing

### Database
- **MongoDB** — Document store
- **Mongoose** — ODM with typed schemas
- **Text Index** — Full-text search on OCR content
- **Compound Indexes** — Optimised user + category + status queries

### AI Service
- **Python 3.11 + FastAPI** — Async microservice
- **EasyOCR** — OCR for images and scanned documents
- **PyMuPDF (fitz)** — Direct text extraction from digital PDFs
- **OpenCV + Pillow** — Image preprocessing (greyscale, denoise, threshold)
- **Rule-Based Classifier** — Pattern matching for 12 Indian document types

---

## System Architecture

```
┌─────────────────────┐
│   Angular Frontend  │  http://localhost:4200
│   (Port 4200)       │
└──────────┬──────────┘
           │ HTTP (JWT Bearer)
           ▼
┌─────────────────────┐
│  Express.js Backend │  http://localhost:3000
│  (Port 3000)        │
│                     │
│  ┌───────────────┐  │
│  │  Job Queue    │  │  (in-process, fire-and-forget)
│  │  (setImmediate│  │
│  └───────┬───────┘  │
└──────────┼──────────┘
           │                    ┌─────────────────────┐
           ├──── MongoDB ──────►│  MongoDB Database   │
           │    (Port 27017)    │  (Port 27017)       │
           │                    └─────────────────────┘
           │
           │ HTTP (multipart/form-data)
           ▼
┌─────────────────────┐
│  FastAPI AI Service │  http://localhost:8000
│  (Port 8000)        │
│                     │
│  1. Preprocessing   │  OpenCV: greyscale, denoise, adaptive threshold
│  2. OCR             │  PyMuPDF (digital PDF) → EasyOCR (image/scanned)
│  3. Extraction      │  Regex + heuristic metadata extraction
│  4. Classification  │  Rule-based pattern matching (12 document types)
└─────────────────────┘
```

---

## AI Pipeline

Every uploaded document goes through four stages asynchronously:

```
UPLOADED → OCR_PENDING → (AI Service) → READY / FAILED
```

1. **Preprocessing** — Converts PDF pages to images, applies OpenCV greyscale + denoising + adaptive thresholding
2. **OCR** — PyMuPDF attempts direct text extraction (fast, high-quality for digital PDFs). Falls back to EasyOCR for scanned or image-only content.
3. **Metadata Extraction** — Regex patterns extract holder name, document number, issue date, expiry date, and issuing organisation
4. **Classification** — Keyword and pattern rules identify document type (Aadhaar Card, PAN Card, Passport, Driving License, etc.)

Results are written back to MongoDB and immediately reflected in the frontend.

---

## Supported Document Types

- Aadhaar Card
- PAN Card
- Passport
- Driving License
- Voter ID
- Birth Certificate
- Degree Certificate
- Marksheet
- Bank Statement
- Salary Slip
- Invoice
- Other

---

## Folder Structure

```
LifeVault/
├── frontend/                  # Angular 17 application
│   └── src/app/
│       ├── core/              # Guards, interceptors, token service
│       ├── features/
│       │   ├── auth/          # Login + Register
│       │   ├── dashboard/     # Stats, recent docs, expiry alerts
│       │   └── documents/     # List, upload, search, detail
│       └── shared/            # Shared UI components
│
├── backend/                   # Express.js REST API
│   └── src/
│       ├── common/            # Job queue, AI client, storage, enums
│       ├── config/            # App config, database, Swagger
│       ├── middleware/         # Auth, error handler, upload, rate limit
│       ├── modules/
│       │   ├── auth/          # Register, login, refresh, logout
│       │   ├── document/      # CRUD, search, dashboard
│       │   └── user/          # User model
│       └── utils/             # Logger, ApiResponse
│
├── ai-service/                # Python FastAPI AI microservice
│   └── app/
│       ├── classification/    # Rule-based document classifier
│       ├── extraction/        # Metadata extraction (regex)
│       ├── ocr/               # EasyOCR + PyMuPDF wrappers
│       ├── preprocessing/     # OpenCV image processing
│       ├── routers/           # POST /process endpoint
│       └── schemas/           # Pydantic response models
│
├── docs/                      # Architecture and API documentation
├── uploads/                   # File storage (userId/year/uuid.ext)
├── models/                    # AI model cache directory
└── docker-compose.yml         # Full-stack Docker orchestration
```

---

## Prerequisites

- **Node.js** v18 or later
- **Python** 3.10 or later
- **MongoDB** 6 or later (local or Atlas)
- **npm** (bundled with Node.js)
- **pip** (bundled with Python)

---

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd LifeVault
```

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — set MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET
```

### 3. Frontend setup

```bash
cd frontend
npm install
```

### 4. AI Service setup

```bash
cd ai-service
pip install -r requirements.txt
```

---

## Running the Application

Start each service in a separate terminal:

### MongoDB

```bash
mongod
# or use MongoDB Compass / Atlas
```

### Backend (Port 3000)

```bash
cd backend
npm run dev
```

The API will be available at `http://localhost:3000/api/v1`  
Swagger UI: `http://localhost:3000/api-docs`

### AI Service (Port 8000)

```bash
cd ai-service
uvicorn main:app --reload --port 8000
```

FastAPI docs: `http://localhost:8000/docs`

### Frontend (Port 4200)

```bash
cd frontend
ng serve
```

Open `http://localhost:4200` in your browser.

---

## Docker (Full Stack)

Run all services with Docker Compose:

```bash
# Copy and configure secrets first
cp backend/.env.example backend/.env
# Edit backend/.env with real JWT secrets

docker compose up -d --build
```

Access the application at `http://localhost:4200`.

---

## API Documentation

The full API is documented with Swagger/OpenAPI.

**Interactive UI:** `http://localhost:3000/api-docs`  
**Raw JSON spec:** `http://localhost:3000/api-docs.json`

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create a new account |
| POST | `/api/v1/auth/login` | Login and receive token pair |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Invalidate refresh token |
| POST | `/api/v1/documents/upload` | Upload a document |
| GET | `/api/v1/documents` | List documents (paginated) |
| GET | `/api/v1/documents/:id` | Get single document with OCR text |
| DELETE | `/api/v1/documents/:id` | Delete document and file |
| GET | `/api/v1/documents/search/query` | Full-text + metadata search |
| GET | `/api/v1/dashboard/stats` | Aggregated statistics |
| GET | `/api/v1/dashboard/recent` | Recent document activity |
| GET | `/api/v1/dashboard/expiring` | Documents expiring soon |

---

## Running Tests

```bash
cd backend
npm test
```

27 tests covering:
- Auth service (register, login, refresh, logout)
- Document service (upload, list, search, findById, delete)
- Error handling and ownership validation

---

## Screenshots

> _Add screenshots of the login page, dashboard, document upload, search, and document detail views here before submission._

---

## Security Notes

- Passwords hashed with bcrypt (12 rounds)
- Refresh tokens stored as bcrypt hashes in MongoDB (not plaintext)
- JWT access token expires in 15 minutes
- Rate limiting: 100 requests per 15 minutes per IP
- Helmet security headers on all responses
- File type and size validation on both client and server
- Per-user ownership verified on every document operation
- **Note:** JWT tokens are stored in `localStorage`. In a production deployment, `httpOnly` cookies would be the recommended approach to mitigate XSS token theft.

---

## Future Enhancements

- Token auto-refresh on 401 response (interceptor retry logic)
- httpOnly cookie-based token storage
- Redis-backed persistent job queue (BullMQ) to survive server restarts
- MongoDB Atlas with authentication credentials for production
- User profile and notification settings pages
- Multi-file batch upload
- S3-compatible cloud storage backend (storage layer is already abstracted)
- Mobile-responsive PWA build

---

## Contributors

- [Your Name] — Full-stack development, AI pipeline, architecture design

---

## License

This project was developed for academic submission as a Final Year Project.
