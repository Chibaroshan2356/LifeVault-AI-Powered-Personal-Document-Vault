---
inclusion: always
---

# LifeVault — Project Context for Kiro

## What This Project Is
LifeVault is an AI-Powered Personal Document Vault.
It is a Final Year Project built to professional standards.

## Critical Rules — Always Follow

1. **Never generate an entire feature at once.** One module at a time.
2. **Explain before coding.** Purpose → folder structure → design decisions → code.
3. **Every generated file must have a header comment.**
4. **No SSR.** LifeVault is an authenticated SPA. Never suggest or enable SSR.
5. **API versioning.** All backend routes use `/api/v1/` prefix.
6. **User ≠ Auth.** Auth module handles tokens. User module handles profile.
7. **Feature-based backend modules.** Not flat `controllers/services/routes/` folders.
8. **Pipeline-based AI structure.** Use `preprocessing/`, `ocr/`, `classification/`, `extraction/`, `metadata/`.
9. **Use Zod for validation** in the backend (not express-validator).
10. **Never hardcode secrets.** Always read from environment variables via `appConfig`.

## Spec Documents (Read Before Implementing)

#[[file:specs/01-srs.md]]
#[[file:specs/02-architecture.md]]
#[[file:specs/03-database.md]]
#[[file:specs/04-api-contract.md]]
#[[file:specs/05-ai-pipeline.md]]
#[[file:specs/06-coding-standards.md]]
#[[file:specs/07-roadmap.md]]

## Current Phase
**Sprint 1 (Authentication) — COMPLETE ✅ — Merged to main**

**Current: Sprint 2 — Document Upload**
Branch: `feature/document-upload`

Sprint 2 scope (do NOT go beyond this):
- Document Mongoose model (with processingHistory, aiVersionInfo fields)
- Multer upload middleware (PDF/image, 10MB limit, MIME validation)
- IStorageService + LocalStorageService (already in common/)
- Document service: upload, findByUser, findById, delete
- Document controller + routes: POST /documents/upload, GET /documents, GET /documents/:id, DELETE /documents/:id
- Background job: enqueue OCR job after upload, return 202 Accepted
- Angular: DocumentUploadComponent (drag-and-drop), DocumentListComponent, DocumentService
- Swagger annotations on all routes
- Unit tests for DocumentService
- Do NOT implement OCR, AI, or classification yet

## Tech Stack
- Frontend: Angular 17, standalone components, no SSR, Angular Material
- Backend: Express.js, TypeScript strict, feature-based modules
- Database: MongoDB + Mongoose
- AI Service: FastAPI, Python 3.11, DocTR OCR
- Validation: **Zod** (backend — not express-validator), Angular Reactive Forms (frontend)
- Auth: JWT (access + refresh tokens), bcrypt
- Logging: Winston with 3 log files (application.log, error.log, access.log)
- API Docs: Swagger UI at /api-docs, raw JSON at /api-docs.json
- Request tracing: X-Request-ID header on every request

## Key Patterns (enforce in every module)

### Background Jobs
Upload → Save file → Create DB record (status: UPLOADED) → Enqueue OCR job → Return HTTP 202
Never run OCR synchronously inside the upload request handler.

**JobQueue note:** Current `JobQueueService` is an in-process placeholder using `setImmediate`.
It is designed to be swapped to BullMQ + Redis before production deployment.
For now it is acceptable — document this clearly in comments.

### AI Pipeline Order (extraction BEFORE classification)
preprocessing → OCR → **extraction** → **classification** → metadata
Extraction runs first so the classifier gets structured fields, not just raw text.

### Document Status Enum (corrected order)
UPLOADED → OCR_PENDING → OCR_COMPLETED
→ EXTRACTION_PENDING → EXTRACTION_COMPLETED
→ CLASSIFICATION_PENDING → CLASSIFICATION_COMPLETED → READY | FAILED

### Processing History
Every document stores a `processingHistory` array:
[{ stage, status, timestamp, durationMs, error? }, ...]
This powers a visual timeline in the UI and aids debugging.

### Document Status Enum (granular)
UPLOADED → OCR_PENDING → OCR_COMPLETED → CLASSIFICATION_PENDING
→ CLASSIFICATION_COMPLETED → EXTRACTION_PENDING → READY | FAILED

### Storage Abstraction
Always inject IStorageService — never use `fs` directly in document.service.ts.
Currently: LocalStorageService. Swap to S3StorageService without touching callers.

### AI Versioning
Every AI pipeline response includes AIVersionInfo:
{ ocrEngine, ocrVersion, classificationModel, classificationVersion }
Store this in MongoDB alongside the OCR result.

### API Resource Naming
All endpoints use plural nouns:
/api/v1/auth, /api/v1/users, /api/v1/documents, /api/v1/search, /api/v1/notifications, /api/v1/dashboard
