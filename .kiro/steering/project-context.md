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
**Phase 1 (Foundation) — COMPLETE**

**Next: Phase 2 — Authentication Module**
Wait for explicit instruction before starting Phase 2.

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
