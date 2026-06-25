# System Architecture
## LifeVault — AI-Powered Personal Document Vault
**Version:** 1.0

---

## 1. Architecture Style

**Microservice-style, monorepo deployment.**

Three independently runnable services communicate via REST APIs:

```
Browser
  │  HTTPS
  ▼
Angular SPA (port 4200)
  │  REST /api/v1/*
  ▼
Express.js Backend (port 3000)
  │  REST (internal)         │  Mongoose ODM
  ▼                           ▼
FastAPI AI Service         MongoDB (port 27017)
  (port 8000)
```

---

## 2. Frontend Architecture

**Pattern:** Lazy-loaded feature modules with standalone components (Angular 17)

```
src/app/
├── app.component.ts       Root shell — only <router-outlet>
├── app.config.ts          Bootstrap providers (router, http, animations)
├── app.routes.ts          Top-level route definitions
├── core/                  Singleton services, interceptors, guards
│   ├── interceptors/      JwtInterceptor, ErrorInterceptor
│   └── guards/            authGuard
├── shared/                Reusable components, directives, pipes
│   ├── components/        LoadingSpinner, ConfirmDialog, etc.
│   └── pipes/             FileSize, RelativeDate, etc.
└── features/              Lazy-loaded page modules
    ├── auth/              login, register
    ├── layout/            App shell (nav + sidebar) wrapping protected routes
    ├── dashboard/         Stats, recent documents, expiry alerts
    ├── documents/         Upload, list, detail
    ├── search/            Search interface
    └── not-found/         404 page
```

**Key Decisions:**
- No SSR — LifeVault is an authenticated dashboard
- Standalone components (Angular 17 default)
- All protected routes nested inside LayoutComponent
- HTTP interceptor adds JWT to every outgoing request

---

## 3. Backend Architecture

**Pattern:** Feature-based modules (vertical slices)

```
src/
├── server.ts              Entry point: load env → connect DB → start HTTP
├── app.ts                 Express factory: middleware stack + routes
├── config/
│   ├── app.config.ts      Typed configuration from process.env
│   └── database.ts        Mongoose connection
├── middleware/
│   ├── error.middleware.ts    Global error handler (last middleware)
│   └── notFound.middleware.ts 404 handler
├── utils/
│   ├── logger.ts          Winston logger
│   └── ApiResponse.ts     Standardized response envelope
├── common/                Shared types, validators, utilities
└── modules/               Feature modules (vertical slices)
    ├── auth/
    │   ├── auth.routes.ts
    │   ├── auth.controller.ts
    │   ├── auth.service.ts
    │   └── auth.validator.ts
    ├── user/
    │   ├── user.routes.ts
    │   ├── user.controller.ts
    │   ├── user.service.ts
    │   └── user.model.ts
    ├── document/
    │   ├── document.routes.ts
    │   ├── document.controller.ts
    │   ├── document.service.ts
    │   └── document.model.ts
    ├── search/
    ├── notification/
    └── index.ts           Aggregates all module routers
```

**Controller rule:** Controllers only parse request, call service, return response.
**Service rule:** All business logic lives in services.
**Model rule:** Models define schema + DB queries only.

---

## 4. AI Service Architecture

**Pattern:** Pipeline stages as independent modules

```
app/
├── core/
│   ├── config.py          Pydantic settings
│   ├── logging_config.py  Rotating file + console logging
│   └── exceptions.py      Custom HTTP exceptions
├── preprocessing/         Stage 1 — image cleaning, deskew, PDF → image
├── ocr/                   Stage 2 — DocTR text extraction
├── classification/        Stage 3 — document type detection
├── extraction/            Stage 4 — named entity extraction
├── metadata/              Stage 5 — structured metadata assembly
├── routers/               FastAPI route handlers (one per pipeline endpoint)
├── schemas/               Pydantic I/O models for all endpoints
└── services/              Orchestrators that chain pipeline stages
```

**Pipeline flow:**
```
Upload
  → preprocessing.clean()
  → ocr.extract()
  → classification.classify()
  → extraction.extract()
  → metadata.assemble()
  → Return ProcessResponse
```

---

## 5. Data Flow: Document Processing

```
1. User uploads file           POST /api/v1/documents/upload
2. Backend validates file      Multer + Zod
3. Multer saves to /uploads
4. MongoDB record created      status: "pending"
5. Backend calls AI service    POST http://ai-service:8000/process
6. AI preprocesses image       OpenCV deskew + denoise
7. DocTR runs OCR              Returns text + confidence
8. Classifier runs             Returns document_type
9. Extractor runs              Returns raw fields
10. Metadata assembled         Returns DocumentMetadata
11. Backend updates MongoDB    status: "completed", ocrText, metadata
12. Frontend polls or receives WS notification
```

---

## 6. Security Architecture

- Passwords hashed with **bcrypt** (12 rounds)
- **JWT** (HS256) for stateless authentication
- **Helmet.js** sets security headers
- **express-rate-limit** prevents brute-force
- **Zod** validates all incoming request bodies
- CORS restricted to frontend origin
- `.env` files never committed (`.gitignore`)
- Secrets validated at startup — fail fast if missing in production
