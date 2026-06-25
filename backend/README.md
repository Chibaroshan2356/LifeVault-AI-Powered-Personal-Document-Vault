# LifeVault Backend

## 📋 Overview

Express.js REST API backend for the LifeVault document management system. Built with TypeScript, MongoDB/Mongoose, and JWT authentication.

## 🏗️ Architecture

### Clean Architecture Layers
```
backend/
├── src/
│   ├── config/         # App configuration, DB connection
│   ├── controllers/    # Request handling, response formatting
│   ├── routes/         # Express route definitions
│   ├── services/       # Business logic layer
│   ├── models/         # Mongoose schema definitions
│   ├── middleware/     # Express middleware (auth, error, upload)
│   ├── validators/     # Request validation schemas
│   ├── utils/          # Utility functions, helpers
│   ├── interfaces/     # TypeScript interfaces
│   ├── types/          # TypeScript type definitions
│   └── server.ts       # Application entry point
└── tests/              # Test files
```

### Responsibility Separation

| Layer | Responsibility |
|-------|---------------|
| **Routes** | Define HTTP endpoints, attach middleware and controllers |
| **Controllers** | Parse request, call service, format response |
| **Services** | Business logic, calls models and external services |
| **Models** | MongoDB schema, data validation, database queries |
| **Middleware** | Cross-cutting concerns (auth, error handling, logging) |
| **Validators** | Input validation with express-validator |
| **Utils** | Reusable utility functions |

## 🔌 API Endpoints

### Planned API Routes

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | User logout |
| POST | `/api/auth/refresh` | Refresh JWT token |

#### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents` | Get all user documents |
| POST | `/api/documents/upload` | Upload new document |
| GET | `/api/documents/:id` | Get document by ID |
| PUT | `/api/documents/:id` | Update document metadata |
| DELETE | `/api/documents/:id` | Delete document |

#### Search
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?q=query` | Search documents |

#### OCR / AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ocr/process/:id` | Trigger OCR for document |
| GET | `/api/ocr/status/:id` | Get OCR processing status |

## 🛠️ Tech Stack

- **Express.js** - Web framework
- **TypeScript** - Type safety
- **MongoDB** + **Mongoose** - Database
- **JWT** - Authentication tokens
- **Multer** - File upload handling
- **Winston** - Logging
- **Helmet** - Security headers
- **express-validator** - Input validation
- **cors** - Cross-origin resource sharing
- **express-rate-limit** - API rate limiting

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Helmet for security headers
- Rate limiting
- Input validation and sanitization
- CORS configuration
- Environment-based configuration

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (v6+)
- npm

### Installation
```bash
npm install
```

### Setup Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Development
```bash
npm run dev
```
Server starts at `http://localhost:3000`

### Production Build
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
npm run lint:fix
```

## 📝 Environment Variables

See `.env.example` for all required environment variables.

## 🗄️ Database Collections

### Users
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  createdAt: Date,
  updatedAt: Date
}
```

### Documents
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: Users),
  originalName: String,
  storedName: String,
  fileType: String,
  category: String,
  uploadDate: Date,
  ocrText: String,
  metadata: {
    holderName: String,
    documentName: String,
    organization: String,
    issueDate: Date,
    expiryDate: Date,
    documentNumber: String
  },
  expiryDate: Date,
  status: String (enum: pending, processing, completed, failed)
}
```

---

**Status:** Foundation phase completed
