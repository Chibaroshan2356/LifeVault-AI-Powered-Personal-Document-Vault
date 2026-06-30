# LifeVault Architecture

## Overview

LifeVault uses a microservice architecture with three distinct services that communicate via REST APIs.

## Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Browser                        │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Angular Frontend (:4200)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Features   │  │   Shared    │  │       Core          │ │
│  │  - auth     │  │  - UI Comp  │  │  - HTTP Interceptors │ │
│  │  - docs     │  │  - Pipes    │  │  - Guards           │ │
│  │  - search   │  │  - Material │  │  - Error Handling   │ │
│  │  - dashboard│  └─────────────┘  └─────────────────────┘ │
│  └─────────────┘                                            │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP/REST
                             ▼
┌────────────────────────────────────────────────────────────┐
│                  Express.js Backend (:3000)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ Routes   │ │Controllers│ │ Services │ │  Middleware  │  │
│  │          │►│          │►│          │ │  - JWT Auth  │  │
│  │ /auth    │ │  Request │ │ Business │ │  - Error     │  │
│  │ /docs    │ │  Handler │ │  Logic   │ │  - Upload    │  │
│  │ /search  │ │          │ │          │ │  - Rate Limit│  │
│  └──────────┘ └──────────┘ └────┬─────┘ └──────────────┘  │
└───────────────────────────────┬─┴───────────────────────────┘
                    ┌───────────┴────────────┐
                    │                        │
                    ▼                        ▼
     ┌──────────────────────┐    ┌───────────────────────────┐
     │     MongoDB (:27017)  │    │   FastAPI AI Service       │
     │                      │    │   (:8000)                  │
     │  Collections:        │    │                            │
     │  - users             │    │  Endpoints:                │
     │  - documents         │    │  - POST /ocr/extract       │
     │  - metadata          │    │  - POST /classify          │
     │                      │    │  - POST /extract-metadata  │
     └──────────────────────┘    └───────────────────────────┘
```

## Data Flow

### Document Upload & Processing Flow
```
User uploads file
      │
      ▼
Angular → POST /api/documents/upload (with file)
      │
      ▼
Backend validates file type & size
      │
      ▼
Multer saves file to /uploads
      │
      ▼
Document record saved to MongoDB (status: "pending")
      │
      ▼
Backend calls AI Service → POST /process
      │
      ▼
AI Service preprocesses image (OpenCV)
      │
      ▼
EasyOCR (or PyMuPDF for digital PDFs) performs OCR → extracts text
      │
      ▼
Classification model → determines document type
      │
      ▼
Extraction model → pulls out metadata fields
      │
      ▼
AI Service returns results to Backend
      │
      ▼
Backend updates MongoDB (status: "completed", ocrText, metadata)
      │
      ▼
Frontend displays results to user
```

### Authentication Flow
```
User submits credentials
      │
      ▼
POST /api/auth/login
      │
      ▼
Backend validates credentials
      │
      ▼
Passwords compared with bcrypt
      │
      ▼
JWT token generated
      │
      ▼
Token returned to frontend
      │
      ▼
Angular stores token in localStorage
      │
      ▼
HTTP Interceptor adds Authorization header to all requests
```

## Design Principles

### SOLID in Context

- **Single Responsibility**: Each controller handles one resource, each service handles one domain
- **Open/Closed**: Service interfaces allow adding features without modifying existing code
- **Liskov Substitution**: Services are injectable and testable with mocks
- **Interface Segregation**: TypeScript interfaces are minimal and focused
- **Dependency Inversion**: Controllers depend on service interfaces, not implementations

### Clean Architecture Layers

```
┌─────────────────────────────────────┐
│           Routes (HTTP Layer)        │  Outer
│  Receives requests, attaches middleware
├─────────────────────────────────────┤
│         Controllers (App Layer)      │
│  Parses request, calls service       │
├─────────────────────────────────────┤
│          Services (Domain Layer)     │
│  Business rules, orchestration       │
├─────────────────────────────────────┤
│          Models (Data Layer)         │  Inner
│  Mongoose schemas, DB operations     │
└─────────────────────────────────────┘
```
