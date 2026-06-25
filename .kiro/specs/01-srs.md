# Software Requirements Specification (SRS)
## LifeVault — AI-Powered Personal Document Vault
**Version:** 1.0  
**Date:** June 2026  
**Status:** Draft

---

## 1. Introduction

### 1.1 Purpose
LifeVault is a web-based platform that allows users to securely upload, store, and manage personal identity and financial documents. Using AI, the system extracts text, classifies document types, and generates structured metadata — making documents searchable and easy to manage.

### 1.2 Scope
The system consists of three independent services:
- **Frontend** — Angular single-page application
- **Backend** — Express.js REST API
- **AI Service** — FastAPI OCR and classification pipeline

### 1.3 Definitions

| Term | Definition |
|------|-----------|
| OCR | Optical Character Recognition — converting image text to machine text |
| Metadata | Structured fields extracted from a document (name, expiry, etc.) |
| JWT | JSON Web Token — stateless authentication mechanism |
| SSR | Server-Side Rendering — explicitly NOT used in this project |

---

## 2. Functional Requirements

### 2.1 Authentication
| ID | Requirement |
|----|------------|
| FR-001 | Users shall be able to register with name, email, and password |
| FR-002 | Users shall be able to log in and receive a JWT access token |
| FR-003 | Passwords shall be hashed using bcrypt before storage |
| FR-004 | JWT tokens shall expire after 7 days; refresh tokens after 30 days |
| FR-005 | All protected endpoints shall reject requests without a valid JWT |

### 2.2 User Profile
| ID | Requirement |
|----|------------|
| FR-010 | Users shall be able to view their profile information |
| FR-011 | Users shall be able to update their name and password |
| FR-012 | User and Auth are separate modules with different responsibilities |

### 2.3 Document Management
| ID | Requirement |
|----|------------|
| FR-020 | Users shall be able to upload PDF and image (JPG, PNG) files |
| FR-021 | Maximum file size is 10 MB per upload |
| FR-022 | Each document shall be associated with the authenticated user |
| FR-023 | Users shall be able to view all their uploaded documents |
| FR-024 | Users shall be able to delete their own documents |
| FR-025 | Document status shall progress: pending → processing → completed / failed |

### 2.4 AI Processing
| ID | Requirement |
|----|------------|
| FR-030 | Uploaded documents shall be sent to the AI service for OCR |
| FR-031 | The AI service shall extract text using DocTR |
| FR-032 | The AI service shall classify the document type |
| FR-033 | The AI service shall extract key metadata fields |
| FR-034 | OCR results and metadata shall be stored in MongoDB |

### 2.5 Search
| ID | Requirement |
|----|------------|
| FR-040 | Users shall be able to search documents by OCR text content |
| FR-041 | Users shall be able to filter by document category |

### 2.6 Notifications
| ID | Requirement |
|----|------------|
| FR-050 | The system shall flag documents expiring within 30 days |
| FR-051 | The dashboard shall display expiry alerts |

---

## 3. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|------------|
| NFR-001 | Security | All API endpoints use HTTPS in production |
| NFR-002 | Security | JWT secrets are never committed to version control |
| NFR-003 | Performance | API responses < 200ms for non-AI operations |
| NFR-004 | Performance | OCR processing < 30 seconds per document |
| NFR-005 | Scalability | Services are independently deployable via Docker |
| NFR-006 | Reliability | MongoDB connection loss handled with graceful degradation |
| NFR-007 | Accessibility | Frontend meets WCAG 2.1 AA standards |
| NFR-008 | Maintainability | All code follows standards in `06-coding-standards.md` |

---

## 4. Constraints

- **Node.js** version 18 or higher
- **Python** version 3.9 or higher
- **MongoDB** version 6.0 or higher
- **Angular** version 17
- No SSR — LifeVault is an authenticated SPA, SSR adds complexity with no benefit

---

## 5. Out of Scope (v1.0)

- Mobile application
- Multi-user sharing / collaboration
- Third-party integrations (DigiLocker, UIDAI)
- Payment processing
- Email notifications (deferred to v1.1)
