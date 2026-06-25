# Coding Standards
## LifeVault — Development Standards
**Version:** 1.0

---

## 1. General Principles

- **SOLID** principles apply across all layers
- **Clean Architecture**: business logic never touches HTTP or DB directly
- **One responsibility per file** — if a file needs a long comment to explain what it does, it should be split
- **No inline business logic** — controllers parse + delegate; services decide

---

## 2. TypeScript (Backend + Frontend)

### Must
- `strict: true` in tsconfig
- `async/await` over `.then()` chains
- Return types on all functions
- Interfaces for all data shapes passed between layers
- Environment variables read via `appConfig` — never `process.env.X` directly in business code
- `HttpError` class for expected errors — never `res.status(400).json(...)` in controllers directly

### Must Not
- `any` type (use `unknown` + type guards if uncertain)
- `var` — always `const` or `let`
- Nested ternaries longer than one line
- Direct `console.log` in production code — use `logger`

### Naming
```
Files:    kebab-case        auth.service.ts
Classes:  PascalCase        AuthService
Vars:     camelCase         accessToken
Consts:   UPPER_SNAKE       JWT_EXPIRES_IN
Enums:    PascalCase        DocumentStatus.Pending
```

---

## 3. Express.js (Backend)

### Controller pattern
```typescript
// ✅ Correct — controller is thin
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(ApiResponse.success('Login successful', result));
  } catch (error) {
    next(error);  // Always pass to error middleware
  }
};
```

### Service pattern
```typescript
// ✅ Correct — service has all business logic
async login(dto: LoginDto): Promise<AuthResult> {
  const user = await UserModel.findOne({ email: dto.email }).select('+password');
  if (!user) throw new HttpError(401, 'Invalid credentials');
  const valid = await bcrypt.compare(dto.password, user.password);
  if (!valid) throw new HttpError(401, 'Invalid credentials');
  return this.generateTokens(user);
}
```

### Route file pattern
```typescript
// ✅ Correct — routes only attach middleware + controller
router.post('/login', validateLogin, login);
```

---

## 4. Python (AI Service)

### Must
- Type annotations on all functions
- Docstrings on every public function and class
- `async def` for all FastAPI route handlers
- Raise custom exceptions from `app/core/exceptions.py`
- Return Pydantic models from routes — never raw dicts

### Naming
```
Files:    snake_case         ocr_service.py
Classes:  PascalCase         OCRService
Funcs:    snake_case         extract_text()
Consts:   UPPER_SNAKE        MAX_FILE_SIZE
```

---

## 5. Angular (Frontend)

### Components
- Standalone components (Angular 17 style)
- `OnPush` change detection for performance
- Unsubscribe in `ngOnDestroy` (prefer `takeUntilDestroyed`)
- Never subscribe in templates — use `async` pipe

### Services
- `providedIn: 'root'` for singleton services
- Return `Observable` — never `Promise` (keep reactive)
- Handle errors in services; rethrow for component-level handling if needed

### HTTP requests
- All requests go through a service — never `HttpClient` directly in components
- JWT interceptor adds auth header automatically — never add manually in components

---

## 6. Git

### Commit message format (Conventional Commits)
```
feat: add user registration endpoint
fix: handle null expiryDate in metadata extractor
docs: update API contract with search endpoint
refactor: extract OCR confidence calculation to helper
test: add unit tests for AuthService.login
chore: update dependencies
```

### Branch strategy
```
main          — production-ready
develop       — integration branch
feature/xxx   — feature branches
fix/xxx       — bug fix branches
```

---

## 7. Comments

- Every file must have a header comment explaining its purpose
- Every non-obvious function must have a JSDoc/docstring
- Commented-out code is only acceptable as a placeholder with a `// TODO:` tag
- Keep comments up to date — wrong comments are worse than no comments
