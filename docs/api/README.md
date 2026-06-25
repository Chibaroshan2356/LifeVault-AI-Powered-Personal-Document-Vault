# LifeVault API Documentation

## Overview

The LifeVault backend exposes a RESTful API on port 3000.
All endpoints are prefixed with `/api`.

## Base URL

Development: `http://localhost:3000/api`

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Response Format

All responses follow this standard structure:

```json
{
  "success": true | false,
  "message": "Human-readable message",
  "data": {},           // Optional - contains the response payload
  "errors": [],         // Optional - validation errors
  "pagination": {       // Optional - for list endpoints
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

## Planned Endpoints

### Authentication

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
```

### Documents

```
GET    /api/documents          - List all documents (paginated)
POST   /api/documents/upload   - Upload a new document
GET    /api/documents/:id      - Get document by ID
PUT    /api/documents/:id      - Update document metadata
DELETE /api/documents/:id      - Delete document
```

### Search

```
GET /api/search?q=query&type=category&page=1&limit=10
```

### OCR

```
POST /api/ocr/process/:id      - Trigger OCR processing
GET  /api/ocr/status/:id       - Check processing status
```

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created |
| 400 | Bad Request - Validation error |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate resource |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

## Error Examples

**Validation Error (400)**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email format" },
    { "field": "password", "message": "Password too short" }
  ]
}
```

**Authentication Error (401)**
```json
{
  "success": false,
  "message": "Token expired, please login again"
}
```

**Not Found Error (404)**
```json
{
  "success": false,
  "message": "Document not found"
}
```

---

**Note:** This document will be updated as endpoints are implemented.
