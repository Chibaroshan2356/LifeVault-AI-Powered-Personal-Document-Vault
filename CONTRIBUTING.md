# Contributing Guide
## LifeVault — Development Standards

This document defines the conventions every developer (and Kiro) must follow
throughout the project. Read this before writing any code.

---

## 1. Branch Naming

```
feature/<scope>        feature/authentication
feature/<scope>        feature/document-upload
fix/<scope>            fix/jwt-expiry-handling
test/<scope>           test/auth-service-unit
docs/<scope>           docs/api-contract-update
chore/<scope>          chore/update-dependencies
```

Rules:
- Always branch from `main`
- One feature per branch
- Delete branch after merge

---

## 2. Commit Message Format (Conventional Commits)

```
<type>(<scope>): <short description>

[optional body]
```

### Types

| Type | When to use |
|------|------------|
| `feat` | New feature or endpoint |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code change with no feature/fix |
| `test` | Adding or updating tests |
| `chore` | Dependencies, config, tooling |
| `style` | Formatting only (no logic change) |

### Examples
```
feat(auth): add POST /auth/register endpoint
feat(auth): implement JWT refresh token rotation
fix(auth): handle expired token in JWT interceptor
test(auth): add unit tests for AuthService.login
docs(api): update Swagger annotations for auth routes
chore(deps): upgrade multer to 2.2.0
```

---

## 3. Folder & File Conventions

### Backend — one module = one folder
```
src/modules/auth/
  auth.routes.ts        Route definitions + Swagger annotations
  auth.controller.ts    Parse request → call service → return response
  auth.service.ts       All business logic
  auth.validator.ts     Zod schemas for request validation
  auth.model.ts         Mongoose schema (if module owns a collection)
```

### Frontend — one feature = one folder
```
src/app/features/auth/
  auth.routes.ts        Lazy-loaded route definitions
  login/
    login.component.ts
    login.component.html
    login.component.scss
    login.component.spec.ts
  register/
    ...
  services/
    auth.service.ts
```

### AI Service — one pipeline stage = one folder
```
app/ocr/
  extractor.py          Main OCR logic
  __init__.py
app/classification/
  classifier.py
  __init__.py
```

---

## 4. Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| TS files | kebab-case | `auth.service.ts` |
| Classes | PascalCase | `AuthService` |
| Variables | camelCase | `accessToken` |
| Constants | UPPER_SNAKE | `JWT_EXPIRES_IN` |
| Enums | PascalCase | `DocumentStatus.READY` |
| Python files | snake_case | `ocr_extractor.py` |
| Python classes | PascalCase | `OCRExtractor` |
| Python functions | snake_case | `extract_text()` |
| Angular components | kebab-case selector | `app-login` |
| Angular services | camelCase injection | `authService` |

---

## 5. Code Rules

### TypeScript (Backend + Frontend)
- `strict: true` — no exceptions
- No `any` — use `unknown` + type guards
- No `var` — always `const` or `let`
- No `process.env.X` in business code — use `appConfig`
- No `console.log` — use `logger`
- All async functions use `async/await`
- All functions have explicit return types
- All errors passed to `next(error)` in controllers — never `res.status()` directly

### Backend Controllers (thin layer)
```typescript
// ✅ Correct
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(ApiResponse.success('Account created', result));
  } catch (err) {
    next(err);
  }
};
```

### Backend Services (all logic here)
```typescript
// ✅ Correct
async register(dto: RegisterDto): Promise<AuthResult> {
  const existing = await UserModel.findOne({ email: dto.email });
  if (existing) throw new HttpError(409, 'Email already registered');
  // ...
}
```

### Python (AI Service)
- Type annotations on all functions
- Docstrings on every public function
- Raise from `app/core/exceptions.py` — never `raise HTTPException` inline
- Return Pydantic models from routes — never raw dicts

---

## 6. Testing Expectations

Every sprint must include tests before the sprint is considered done.

| Layer | Tool | Location |
|-------|------|---------|
| Backend unit | Jest | `backend/tests/unit/` |
| Backend integration | Jest + Supertest | `backend/tests/integration/` |
| Frontend unit | Jasmine/Karma | `*.spec.ts` alongside components |
| AI Service | pytest | `ai-service/tests/` |

### Minimum test coverage per sprint
- Happy path — the expected success case
- Validation error — send invalid input, expect 400
- Auth error — missing/invalid token, expect 401
- Not found — non-existent resource, expect 404

---

## 7. Swagger Documentation

Every route must have JSDoc Swagger annotations before the sprint is closed.

```typescript
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user account
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterDto'
 *     responses:
 *       201:
 *         description: Account created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already registered
 */
```

---

## 8. Sprint Done Criteria

A sprint is only complete when ALL of the following are true:

- [ ] Feature works end-to-end (backend + frontend)
- [ ] All new routes documented in Swagger (`/api-docs`)
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] No TypeScript errors (`npm run build` passes)
- [ ] No lint errors (`npm run lint` passes)
- [ ] `.kiro/specs/` updated if API contract changed
- [ ] Git commit with conventional commit message
- [ ] Pushed to GitHub

---

## 9. Architecture Rules (frozen — do not change)

- ❌ Do not rename existing folders
- ❌ Do not reorganize services or modules
- ❌ Do not change Angular architecture
- ❌ Do not add new foundation files
- ✅ Add new files only inside existing module folders
- ✅ All new features go inside `src/modules/<feature>/` (backend)
  or `src/app/features/<feature>/` (frontend)

---

## Sprint Schedule

| Sprint | Feature |
|--------|---------|
| 1 | Authentication (register, login, JWT, refresh, logout) |
| 2 | User Profile (get profile, update, change password) |
| 3 | Document Upload (file upload, DB record, 202 response) |
| 4 | AI Service Communication (backend → AI service) |
| 5 | OCR Integration (DocTR, store extracted text) |
| 6 | Information Extraction (regex-based entity extraction) |
| 7 | Document Classification (rule-based classifier) |
| 8 | Dashboard (stats, recent uploads, expiry alerts) |
| 9 | Search (OCR text search, category filters) |
| 10 | Notifications (expiry reminders, scheduled jobs) |
| 11 | Testing (E2E, load testing) |
| 12 | Deployment (Docker production, final documentation) |
