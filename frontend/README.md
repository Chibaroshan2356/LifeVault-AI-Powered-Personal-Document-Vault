# LifeVault Frontend

## 📱 Overview

Modern Angular application for the LifeVault document management system. Built with TypeScript, Angular Material, and RxJS for a responsive and reactive user experience.

## 🏗️ Architecture

### Module Structure
```
frontend/
├── src/
│   ├── app/
│   │   ├── core/           # Singleton services, guards, interceptors
│   │   ├── shared/         # Shared components, directives, pipes
│   │   ├── features/       # Feature modules
│   │   │   ├── auth/       # Authentication
│   │   │   ├── dashboard/  # Dashboard
│   │   │   ├── documents/  # Document management
│   │   │   └── search/     # Search functionality
│   │   ├── models/         # TypeScript interfaces and types
│   │   └── services/       # Application services
│   ├── assets/             # Static assets
│   ├── environments/       # Environment configs
│   └── styles/             # Global styles
```

## 🎨 Design Principles

### Clean Architecture
- **Core Module**: Singleton services, HTTP interceptors, guards (imported once in AppModule)
- **Shared Module**: Reusable components, directives, pipes (imported in multiple modules)
- **Feature Modules**: Lazy-loaded, self-contained features
- **Smart vs Presentational**: Container components (smart) manage state, presentation components display data

### Module Responsibilities

#### Core Module
- Authentication services
- HTTP interceptors (JWT, error handling)
- Route guards
- Global error handling
- App configuration

#### Shared Module
- UI components (buttons, cards, dialogs)
- Common directives
- Utility pipes
- Material module exports

#### Feature Modules
- Lazy-loaded for performance
- Self-contained business logic
- Feature-specific components and services

## 🛠️ Tech Stack

- **Angular** (latest stable)
- **TypeScript** (strict mode)
- **Angular Material** - UI components
- **RxJS** - Reactive programming
- **Angular Router** - Navigation
- **HttpClient** - API communication

## 📦 Key Dependencies

```json
{
  "@angular/core": "^17.x",
  "@angular/material": "^17.x",
  "rxjs": "^7.x",
  "typescript": "^5.x"
}
```

## 🚀 Getting Started

### Installation
```bash
npm install
```

### Development Server
```bash
npm start
# or
ng serve
```
Navigate to `http://localhost:4200`

### Build
```bash
npm run build
# Production build
npm run build:prod
```

### Linting
```bash
npm run lint
```

### Testing
```bash
# Unit tests
npm test

# E2E tests
npm run e2e
```

## 🔧 Configuration

### Environment Files
- `environment.ts` - Development
- `environment.prod.ts` - Production

### API Configuration
Configure backend API URL in environment files:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'
};
```

## 📝 Coding Standards

### TypeScript
- Use strict mode
- Define interfaces for all data models
- Avoid `any` type
- Use async/await with RxJS where appropriate

### Components
- Use OnPush change detection for performance
- Unsubscribe from observables in ngOnDestroy
- Keep components focused and small
- Use smart/presentational pattern

### Services
- Injectable with `providedIn: 'root'` or module
- Handle errors properly
- Use RxJS operators effectively
- Return observables, not promises

### Naming Conventions
- Components: `feature-name.component.ts`
- Services: `feature-name.service.ts`
- Models: `feature-name.model.ts`
- Guards: `feature-name.guard.ts`

## 🎯 Features (Planned)

- [ ] User authentication
- [ ] Document upload with preview
- [ ] Document list with filters
- [ ] Smart search interface
- [ ] Dashboard with statistics
- [ ] Document expiry alerts
- [ ] User profile management

## 📚 Resources

- [Angular Documentation](https://angular.io/docs)
- [Angular Material](https://material.angular.io)
- [RxJS Documentation](https://rxjs.dev)

---

**Status:** Foundation phase completed
