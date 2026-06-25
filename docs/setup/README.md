# LifeVault Setup Guide

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | v18+ | Backend + Frontend |
| npm | v9+ | Package manager |
| Python | 3.9+ | AI Service |
| pip | Latest | Python packages |
| MongoDB | 6.0+ | Database |
| Git | Latest | Version control |

## Quick Start

### 1. Clone Repository
```bash
git clone <repository-url>
cd LifeVault
```

### 2. Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your values
```

### 3. Setup Frontend
```bash
cd frontend
npm install
```

### 4. Setup AI Service
```bash
cd ai-service

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

### 5. Start MongoDB
```bash
mongod
# Or with custom data directory:
mongod --dbpath /path/to/data
```

### 6. Start All Services

Open three terminal windows:

**Terminal 1 - Backend**
```bash
cd backend
npm run dev
```

**Terminal 2 - AI Service**
```bash
cd ai-service
uvicorn main:app --reload --port 8000
```

**Terminal 3 - Frontend**
```bash
cd frontend
ng serve
```

## Port Configuration

| Service | Port | URL |
|---------|------|-----|
| Frontend | 4200 | http://localhost:4200 |
| Backend API | 3000 | http://localhost:3000 |
| AI Service | 8000 | http://localhost:8000 |
| MongoDB | 27017 | mongodb://localhost:27017 |

## Environment Configuration

### Backend .env
Copy `/backend/.env.example` to `/backend/.env` and configure:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens (use strong random value)
- `CORS_ORIGIN` - Frontend URL

### AI Service .env
Copy `/ai-service/.env.example` to `/ai-service/.env` and configure:
- `OCR_MODEL` - DocTR model selection
- `USE_GPU` - Enable GPU for faster OCR

## Common Issues

### MongoDB Connection
- Ensure MongoDB is running: `mongod --dbpath <path>`
- Check connection string in backend `.env`

### Python Virtual Environment
- Always activate venv before running: `venv\Scripts\activate`
- If packages missing: `pip install -r requirements.txt`

### Angular CLI not found
```bash
npm install -g @angular/cli
```

### TypeScript errors in backend
```bash
cd backend
npm install
npm run build
```
