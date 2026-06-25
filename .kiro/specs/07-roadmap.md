# Development Roadmap
## LifeVault — Implementation Plan
**Version:** 1.0

---

## Implementation Order

Each phase builds on the previous. No phase begins before the previous is reviewed.

---

### Phase 1 — Foundation ✅
- [x] Project structure created
- [x] Angular CLI scaffold (no SSR)
- [x] Feature-based backend modules
- [x] AI service pipeline folders
- [x] Docker Compose
- [x] Spec documents (.kiro/specs/)

---

### Phase 2 — Authentication Module
**Backend:**
- `user.model.ts` — Mongoose schema (name, email, password hash, role)
- `auth.service.ts` — register, login, refresh, logout
- `auth.controller.ts` — thin HTTP layer
- `auth.routes.ts` — POST /auth/register, /auth/login, /auth/refresh, /auth/logout
- `auth.validator.ts` — Zod schemas for register + login

**Frontend:**
- `LoginComponent` — reactive form, Material UI
- `RegisterComponent` — reactive form, Material UI
- `AuthService` — login, register, logout, token storage
- `JwtInterceptor` — attaches Bearer token to all requests
- `authGuard` — protects layout routes

**Tests:**
- AuthService unit tests
- Login + register integration tests

---

### Phase 3 — User Profile Module
**Backend:**
- `user.service.ts` — getProfile, updateProfile, changePassword
- `user.controller.ts`
- `user.routes.ts` — GET/PUT /users/me

**Frontend:**
- `ProfileComponent` — view + edit form
- `UserService` — wraps /users/me API

---

### Phase 4 — Document Upload Module
**Backend:**
- `document.model.ts` — Mongoose schema
- `document.service.ts` — upload, list, getById, delete
- `document.controller.ts`
- `document.routes.ts`
- Multer configuration (file filter, size limit)

**Frontend:**
- `DocumentUploadComponent` — drag-and-drop + file picker
- `DocumentListComponent` — paginated table/grid
- `DocumentService` — upload (with progress), list, delete

---

### Phase 5 — AI Service Core Pipeline
**AI Service:**
- `preprocessing/processor.py` — validate, PDF→image, deskew
- `ocr/extractor.py` — DocTR integration
- `classification/classifier.py` — rule-based classifier
- `extraction/extractor.py` — regex-based entity extraction
- `metadata/assembler.py` — normalize + structure
- `routers/process.py` — POST /process
- `schemas/pipeline.py` — Pydantic I/O models

**Backend integration:**
- `ai.service.ts` — calls AI service, handles retries
- Wire into document upload flow

---

### Phase 6 — Document Detail View
**Frontend:**
- `DocumentDetailComponent` — OCR text, metadata, category badge
- `MetadataCardComponent` — structured display

---

### Phase 7 — Search Module
**Backend:**
- MongoDB text index on `ocrText`
- `search.routes.ts` — GET /search?q=...
- `search.service.ts` — MongoDB $text query

**Frontend:**
- `SearchComponent` — input + results
- `SearchService`

---

### Phase 8 — Dashboard Module
**Frontend:**
- `DashboardComponent` — stats grid
- `StatsCardComponent`
- `RecentDocumentsComponent`
- `ExpiryAlertsComponent`

**Backend:**
- `dashboard.service.ts` — aggregate stats

---

### Phase 9 — Notifications / Expiry System
**Backend:**
- `notification.service.ts` — check expiryDate < 30 days
- `notification.routes.ts` — GET /notifications, PATCH /notifications/:id/read

**Frontend:**
- Notification badge in nav
- Notification list panel

---

### Phase 10 — Polish + Testing
- E2E tests (Cypress or Playwright)
- Load testing
- Docker Compose production configuration
- README final update
- Presentation preparation

---

## Technology Decisions Log

| Decision | Rationale |
|----------|-----------|
| No SSR | LifeVault is authenticated SPA; SSR adds complexity, no SEO benefit |
| Standalone Angular components | Angular 17 default; more tree-shakeable |
| Feature-based backend modules | Scales better than flat layers |
| Zod for validation | Runtime type safety; better than express-validator for TypeScript |
| DocTR over Tesseract | Better accuracy on Indian documents; deep-learning based |
| MongoDB text index | Simple full-text search without Elasticsearch |
| JWT (not sessions) | Stateless; works with microservice architecture |
| User ≠ Auth modules | Auth manages tokens; User manages profile data |
