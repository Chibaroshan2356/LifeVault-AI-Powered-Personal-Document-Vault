# Database Design
## LifeVault — MongoDB Schema
**Version:** 1.0

---

## 1. Database: `lifevault`

---

## 2. Collections

### 2.1 `users`

Stores registered user accounts.

```javascript
{
  _id:       ObjectId,         // Auto-generated MongoDB ID
  name:      String,           // Full name — required
  email:     String,           // Unique — required — lowercase
  password:  String,           // bcrypt hash — never returned in API responses
  role:      String,           // "user" | "admin" — default: "user"
  isActive:  Boolean,          // Soft delete flag — default: true
  createdAt: Date,             // Auto-managed by Mongoose timestamps
  updatedAt: Date,
}
```

**Indexes:**
- `email` — unique index

---

### 2.2 `documents`

Stores uploaded document records and AI-processed results.

```javascript
{
  _id:          ObjectId,
  userId:       ObjectId,      // ref: users — required
  originalName: String,        // File name as uploaded
  storedName:   String,        // UUID-based name on disk
  mimeType:     String,        // "application/pdf" | "image/jpeg" | "image/png"
  fileSize:     Number,        // Bytes
  category:     String,        // Classified type (see 2.3)
  uploadDate:   Date,

  // AI Processing
  status:       String,        // DocumentStatus enum (see enums.ts)

  // Granular processing history — shown as a timeline in the UI
  processingHistory: [
    {
      stage:     String,       // "UPLOAD" | "OCR" | "EXTRACTION" | "CLASSIFICATION" | "METADATA"
      status:    String,       // "started" | "completed" | "failed"
      timestamp: Date,
      durationMs: Number,      // How long the stage took
      error:     String,       // Only set on failure
    }
  ],

  ocrText:      String,        // Full extracted text
  ocrConfidence: Number,       // 0–1 confidence score

  // AI version info — which model produced this result
  aiVersionInfo: {
    ocrEngine:             String,   // "DocTR"
    ocrVersion:            String,   // "0.8.1"
    classificationModel:   String,   // "RuleBased" | "LayoutLMv3"
    classificationVersion: String,
  },

  metadata: {
    holderName:     String,
    documentName:   String,
    organization:   String,
    issueDate:      Date,
    expiryDate:     Date,
    documentNumber: String,
  },

  expiryDate:   Date,          // Denormalized from metadata for query performance
  errorMessage: String,        // Set when status is FAILED

  createdAt:    Date,
  updatedAt:    Date,
}
```

**Indexes:**
- `userId` — for fetching user's documents
- `userId + status` — for filtering by status
- `expiryDate` — for expiry alerts
- `ocrText` — text index for full-text search

---

### 2.3 Document Categories

```
Aadhaar Card
PAN Card
Passport
Driving License
Voter ID
Birth Certificate
Degree Certificate
Marksheet
Bank Statement
Salary Slip
Invoice
Other
```

---

### 2.4 `notifications` (future v1.1)

```javascript
{
  _id:        ObjectId,
  userId:     ObjectId,   // ref: users
  documentId: ObjectId,   // ref: documents
  type:       String,     // "expiry_warning" | "processing_complete" | "processing_failed"
  message:    String,
  isRead:     Boolean,    // default: false
  createdAt:  Date,
}
```

---

## 3. Relationships

```
users (1) ──────< documents (many)
users (1) ──────< notifications (many)
documents (1) ──< notifications (many)
```

---

## 4. Mongoose Conventions

- Use `timestamps: true` on all schemas (auto-manages `createdAt`/`updatedAt`)
- Use `{ strict: true }` (default — prevents unexpected fields)
- Never return `password` field in API responses — use `.select('-password')`
- Use `lean()` for read-only queries to improve performance
- Use transactions for multi-document writes (when needed)

---

## 5. Indexes Summary

| Collection | Field(s) | Type | Reason |
|-----------|---------|------|--------|
| users | email | unique | Login lookup |
| documents | userId | regular | User's document list |
| documents | userId + status | compound | Filter by status |
| documents | expiryDate | regular | Expiry alerts |
| documents | ocrText | text | Full-text search |
