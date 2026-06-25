# API Contract
## LifeVault — Backend REST API v1
**Base URL:** `http://localhost:3000/api/v1`  
**Version:** 1.0

---

## 1. Response Envelope

Every response follows this structure:

```json
{
  "success": true,
  "message": "Human-readable description",
  "data": {},
  "errors": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

- `data` — present on success responses
- `errors` — array of `{ field, message }` on validation failures
- `pagination` — present on list endpoints only

---

## 2. Authentication

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

---

## 3. Auth Endpoints

### POST `/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "name":     "John Doe",
  "email":    "john@example.com",
  "password": "SecurePass123!"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user":         { "id": "...", "name": "John Doe", "email": "john@example.com" },
    "accessToken":  "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

---

### POST `/auth/login`
Authenticate and receive tokens.

**Request Body:**
```json
{ "email": "john@example.com", "password": "SecurePass123!" }
```

**Response 200:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user":         { "id": "...", "name": "John Doe", "email": "john@example.com" },
    "accessToken":  "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

---

### POST `/auth/logout`
Invalidate the refresh token.

**Response 200:** `{ "success": true, "message": "Logged out successfully" }`

---

### POST `/auth/refresh`
Get a new access token using a refresh token.

**Request Body:** `{ "refreshToken": "eyJ..." }`

**Response 200:** `{ "success": true, "data": { "accessToken": "eyJ..." } }`

---

## 4. User Endpoints

### GET `/users/me`
Get the authenticated user's profile.

**Response 200:**
```json
{
  "success": true,
  "data": { "id": "...", "name": "John Doe", "email": "john@example.com", "createdAt": "..." }
}
```

---

### PUT `/users/me`
Update profile (name and/or password).

**Request Body:**
```json
{ "name": "John Smith", "currentPassword": "...", "newPassword": "..." }
```

---

## 5. Document Endpoints

### GET `/documents`
List all documents for the authenticated user.

**Query Params:** `?page=1&limit=10&category=Passport&status=completed`

**Response 200:**
```json
{
  "success": true,
  "data": [ { "id": "...", "originalName": "passport.pdf", "category": "Passport", "status": "completed", "uploadDate": "..." } ],
  "pagination": { "page": 1, "limit": 10, "total": 3, "totalPages": 1 }
}
```

---

### POST `/documents/upload`
Upload a new document. Triggers AI processing pipeline.

**Content-Type:** `multipart/form-data`  
**Form field:** `file` — the document (PDF/JPG/PNG, max 10MB)

**Response 201:**
```json
{
  "success": true,
  "message": "Document uploaded and processing started",
  "data": { "id": "...", "originalName": "aadhaar.jpg", "status": "pending" }
}
```

---

### GET `/documents/:id`
Get a single document with OCR text and metadata.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id":           "...",
    "originalName": "aadhaar.jpg",
    "category":     "Aadhaar Card",
    "status":       "completed",
    "ocrText":      "Government of India ...",
    "metadata": {
      "holderName":     "John Doe",
      "documentNumber": "1234 5678 9012",
      "expiryDate":     null
    }
  }
}
```

---

### DELETE `/documents/:id`
Delete a document. Also removes the file from disk.

**Response 200:** `{ "success": true, "message": "Document deleted" }`

---

## 6. Search Endpoint

### GET `/search`
Full-text search across OCR text.

**Query Params:** `?q=aadhaar&category=Aadhaar+Card&page=1&limit=10`

**Response 200:**
```json
{
  "success": true,
  "data": [ { "id": "...", "originalName": "...", "category": "Aadhaar Card", "snippet": "...matching text..." } ],
  "pagination": { ... }
}
```

---

## 7. HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid/expired token) |
| 403 | Forbidden (valid token, insufficient permission) |
| 404 | Not Found |
| 409 | Conflict (duplicate email, etc.) |
| 413 | Payload Too Large |
| 415 | Unsupported Media Type |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |
