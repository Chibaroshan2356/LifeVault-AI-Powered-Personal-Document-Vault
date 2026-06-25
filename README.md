# LifeVault - AI-Powered Personal Document Vault

## 🎯 Project Overview

LifeVault is an intelligent document management system that securely stores, organizes, and understands your important personal documents using AI-powered features.

### Key Features
- 🔐 Secure document storage with JWT authentication
- 🤖 AI-powered OCR using DocTR
- 📊 Automatic document classification
- 🔍 Intelligent metadata extraction
- 🔎 Smart search capabilities
- ⏰ Document expiry reminders
- 📱 Modern, responsive UI

## 🏗️ Architecture

LifeVault follows a microservice architecture with three main components:

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Angular   │ ───► │  Express.js │ ───► │   FastAPI   │
│  Frontend   │      │   Backend   │      │ AI Service  │
└─────────────┘      └─────────────┘      └─────────────┘
                            │
                            ▼
                     ┌─────────────┐
                     │   MongoDB   │
                     │  Database   │
                     └─────────────┘
```

## 📁 Project Structure

```
LifeVault/
├── frontend/          # Angular application
├── backend/           # Express.js REST API
├── ai-service/        # FastAPI AI/OCR service
├── docs/              # Documentation
├── uploads/           # Temporary file storage
├── datasets/          # AI training datasets
├── models/            # Trained ML models
└── scripts/           # Utility scripts
```

## 🛠️ Tech Stack

### Frontend
- **Angular** - Modern web framework
- **TypeScript** - Type-safe JavaScript
- **Angular Material** - UI component library
- **RxJS** - Reactive programming

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **JWT** - Authentication
- **Multer** - File uploads

### Database
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB

### AI Service
- **Python** - Programming language
- **FastAPI** - Modern API framework
- **DocTR** - OCR engine
- **OpenCV** - Image processing
- **Pillow** - Image manipulation

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)
- MongoDB (v6+)
- npm or yarn
- pip

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd LifeVault
   ```

2. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   ```

3. **Setup Backend**
   ```bash
   cd backend
   npm install
   ```

4. **Setup AI Service**
   ```bash
   cd ai-service
   pip install -r requirements.txt
   ```

### Running the Application

1. **Start MongoDB**
   ```bash
   mongod
   ```

2. **Start Backend** (Port 3000)
   ```bash
   cd backend
   npm run dev
   ```

3. **Start AI Service** (Port 8000)
   ```bash
   cd ai-service
   uvicorn main:app --reload
   ```

4. **Start Frontend** (Port 4200)
   ```bash
   cd frontend
   ng serve
   ```

Access the application at: `http://localhost:4200`

## 📚 Documentation

- [Architecture Guide](./docs/architecture/README.md)
- [API Documentation](./docs/api/README.md)
- [Setup Guide](./docs/setup/README.md)

## 🧪 Development

### Code Quality
- ESLint for linting
- Prettier for code formatting
- TypeScript strict mode enabled
- Git hooks for pre-commit checks

### Development Standards
- Follow SOLID principles
- Clean Architecture pattern
- Modular design
- Comprehensive comments
- Async/await for async operations
- Proper error handling

## 📝 License

This is a Final Year Project developed for educational purposes.

## 👥 Contributors

- [Your Name] - Developer

## 🔄 Project Status

**Current Phase:** Foundation Setup ✅

### Completed
- [x] Project structure created
- [x] Configuration files setup
- [x] Documentation initialized

### Next Steps
- [ ] User authentication module
- [ ] File upload functionality
- [ ] OCR integration
- [ ] Document classification
- [ ] Metadata extraction
- [ ] Search functionality
- [ ] Dashboard implementation
- [ ] Expiry reminder system

---

**Note:** This project is under active development. Features are being implemented incrementally following clean architecture principles.
