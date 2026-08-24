# Family Finance Manager — Phase Implementation Notes (Study Guide)

> **Purpose:** A living, personal reference that documents *what* was built in each phase,
> *how* to run and test it, and *why* each important concept/pattern is used — written to
> learn from, not just to ship.
>
> This file is **git-ignored** on purpose (see `.gitignore`). It is your study notebook.
>
> **Convention:** Every time a phase is completed, a new `## Phase N` section is appended
> here with the same structure: Overview → Files → Concepts → Flow walkthroughs → How to run → How to test.

---

## Table of Contents

- [Global Architecture Cheat-Sheet](#global-architecture-cheat-sheet)
- [Phase 0 — Foundation](#phase-0--foundation)
- [Phase 1 — Authentication](#phase-1--authentication)
- [Phase 2 — Family, Members & RBAC](#phase-2--family-members--rbac)
- [Phase 3 — Income Module](#phase-3--income-module)
- [Phase 4 — Expense Module](#phase-4--expense-module)
- [Phase 5 — Budget Planning](#phase-5--budget-planning)
- [Phase 6 — Dashboard](#phase-6--dashboard)
- [Phase 7 — EMI Management](#phase-7--emi-management)
- [Appendix A — Glossary of Concepts](#appendix-a--glossary-of-concepts)

---

## Global Architecture Cheat-Sheet

The whole backend follows **Clean Architecture** with a strict one-directional call flow:

```
HTTP Request
   │
   ▼
Route            (auth.routes.ts)      → declares URL + attaches middleware
   │
   ▼
Middleware       (validate, authenticate, rateLimit)  → cross-cutting concerns
   │
   ▼
Controller       (auth.controller.ts)  → reads req / writes res, NO business logic
   │
   ▼
Service          (auth.service.ts)     → business rules, orchestration, THE brain
   │
   ▼
Repository       (auth.repository.ts)  → the ONLY layer that talks to Prisma/DB
   │
   ▼
Database         (PostgreSQL via Prisma)
```

**Why this layering matters (study point):**
- **Controllers stay thin** → easy to swap HTTP for GraphQL/gRPC later without touching logic.
- **Services are pure business logic** → unit-testable without HTTP or a real DB (mock the repo).
- **Repositories isolate persistence** → if you switch ORM or add caching, only this layer changes.
- Each layer only knows about the layer directly beneath it. This is the *Dependency Rule*.

**Multi-tenancy model:** every business table has a `familyId`. A "family" is the tenant
(workspace). Data is isolated at the row level — queries are always scoped by `familyId` so
one family can never read another's data.

**Response envelope:** every API response has the same shape (`api-response.util.ts`):
```json
{ "success": true, "message": "…", "data": { … }, "meta": { …pagination… } }
```
This consistency lets the frontend handle all responses/errors uniformly.

---

## Phase 0 — Foundation

**Status:** ✅ Complete (pre-existing before these notes)

### Overview
Sets up the monorepo, tooling, database schema, config, error handling, and empty page/route
scaffolding for both `/server` and `/client`. No business features yet — just the skeleton
everything else hangs on.

### Key files & what they do

**Server config (`server/src/config/`)**
- `env.ts` — Validates every environment variable with **Zod** at startup. If a var is missing
  or malformed, the process **exits immediately** (`process.exit(1)`) instead of crashing later
  with a confusing error. `export const env` is the single typed source of config.
- `database.ts` — Creates a **singleton** `PrismaClient`. Uses a `globalThis` cache so that in
  dev (with hot-reload) you don't open a new DB connection on every reload.
- `redis.ts` — Optional Redis client with `lazyConnect`; if Redis is down the app logs a warning
  and **continues without cache** (graceful degradation).
- `cors.ts` — Whitelist-based CORS. Only `CLIENT_URL` origin is allowed; credentials enabled so
  cookies work.
- `app.ts` — Assembles the Express app: Helmet (security headers) → CORS → body parsing →
  cookie parser → compression → rate limiting → routes → 404 → global error handler. **Order
  matters**: error handler must be last.

**Shared building blocks (`server/src/shared/`)**
- `errors/AppError.ts` — Base custom error carrying `statusCode` + `code` + `isOperational`.
  Subclasses: `AuthError` (401), `ForbiddenError` (403), `ValidationError` (422), `NotFoundError` (404).
  **Why:** throwing typed errors lets the global error middleware translate them into correct
  HTTP status codes automatically.
- `utils/` — `jwt`, `bcrypt`, `email` (Nodemailer), `cloudinary`, `token`, `date`, `logger`
  (Winston), `pagination`, `api-response`.
- `constants/` — `roles.ts` (role hierarchy + `hasRoleOrAbove`), `permissions.ts`
  (permission → allowed-roles map + `can()`), `messages.ts` (all user-facing strings, `MSG.*`).

**Middlewares (`server/src/middlewares/`)**
- `error.middleware.ts` — Central error translator. Maps `ValidationError`→422, `AppError`→its
  status, Zod errors→422, Prisma `P2002`(unique)→409, `P2025`(not found)→404, everything else→500.
- `validate.middleware.ts` — `validate(schema, target)` runs a Zod schema against `req.body`
  (or query/params) and **replaces** it with the parsed/coerced value.
- `auth.middleware.ts` — `authenticate` verifies the JWT access token and loads the user.
- `rbac.middleware.ts` — `requirePermission(...)` / `requireRole(...)` guards.
- `tenant.middleware.ts` — `resolveTenant` attaches the active family membership to the request.
- `rateLimit.middleware.ts` — `generalLimiter` (100/15min) and `authLimiter` (5/15min).
- `audit.middleware.ts` — Wraps `res.json` to write an `AuditLog` row after successful writes.

**Database (`server/prisma/schema.prisma`)** — Full schema: User/Auth, Tenant/Family/Member,
Income, Expense, Budget, Goal, EMI, Bills, Rent, SchoolFee, ChitFund, Investment/Asset/Liability,
Notification/Reminder, Document, Subscription, AuditLog, plus all enums. `seed.ts` creates a
super-admin + demo family.

**Client foundation (`client/src/`)** — Vite + React + TS + Tailwind. Providers (Theme, Query,
Auth), Router with `ProtectedRoute`/`GuestRoute`, Axios instance with token-refresh interceptor,
Zustand stores (`auth`, `ui`), layout (Sidebar/Topbar/AppLayout/AuthLayout), and placeholder
pages for every future module.

### Concepts to study from Phase 0
| Concept | Where | One-line takeaway |
|---|---|---|
| Env validation at boot | `config/env.ts` | Fail fast, fail loud — never run with bad config. |
| Prisma singleton | `config/database.ts` | Avoid connection exhaustion during hot-reload. |
| Global error handling | `middlewares/error.middleware.ts` | One place converts errors → HTTP status. |
| Custom error classes | `shared/errors/*` | Throw meaning, not status codes, in business code. |
| Graceful shutdown | `server.ts` | Close DB/HTTP cleanly on SIGTERM/SIGINT. |
| Axios refresh interceptor | `client/src/services/api.ts` | Transparently refresh expired tokens + queue retries. |

---

## Phase 1 — Authentication

**Status:** ✅ Implemented (pending review)

### Overview
Complete email/password auth with a **verify-before-login** flow, JWT access tokens, **rotating**
refresh tokens stored in the DB and delivered as an httpOnly cookie, plus forgot/reset password,
change password, and profile read/update. On registration a brand-new **Tenant + Family +
owning Member + Settings + trial Subscription** are created in a single transaction.

### Endpoints (base `/api/v1/auth`)

| Method | Path | Auth? | Purpose |
|---|---|---|---|
| POST | `/register` | – | Create user + family workspace, email a verification link |
| POST | `/login` | – | Validate credentials → access token (body) + refresh token (cookie) |
| POST | `/refresh` | cookie | Rotate refresh token → new access token |
| POST | `/logout` | cookie | Revoke refresh token, clear cookie |
| POST | `/verify-email` | – | Activate account from emailed token |
| POST | `/resend-verification` | – | Re-send verification email |
| POST | `/forgot-password` | – | Email a reset link (no user enumeration) |
| POST | `/reset-password` | – | Set new password from reset token + revoke all sessions |
| GET | `/me` | Bearer | Current user + family membership |
| PATCH | `/me` | Bearer | Update profile fields |
| PATCH | `/change-password` | Bearer | Change password (verifies current), revoke sessions |

### Backend files added (`server/src/modules/auth/`)

- **`auth.types.ts`** — DTOs/interfaces: input shapes, `UserDto`, `MemberDto`, `AuthResult`.
  DTOs (Data Transfer Objects) are the *public* shape we return — deliberately **excludes**
  `passwordHash`, `verificationToken`, etc. Never leak the raw DB row.
- **`auth.validator.ts`** — Zod schemas for every request. Password policy: min 8 chars, ≥1 letter,
  ≥1 number. Email is `.trim().toLowerCase()`-normalized so `Bob@X.com` == `bob@x.com`.
- **`auth.repository.ts`** — All Prisma access. Notable: `createAccount()` uses
  `prisma.$transaction` to create User+Tenant+Family+Member+Settings+Subscription atomically;
  `generateUniqueFamilyCode()` retries until it finds an unused code.
- **`auth.service.ts`** — The brain. Password hashing, token issuing/rotation, email sending,
  verification/reset expiry checks, no-enumeration logic. Helper `issueTokens()` signs an access
  token and persists a refresh token row.
- **`auth.controller.ts`** — Thin handlers. Sets/clears the refresh cookie, calls the service,
  sends the standard envelope. Wraps everything in try/catch → `next(err)` so the global error
  middleware handles it.
- **`auth.routes.ts`** — Wires paths → middleware chain → controller. Public auth routes get
  `authLimiter` (brute-force protection). Protected routes get `authenticate`.

### Backend files touched (foundation)
- **`shared/utils/cookie.util.ts`** (new) — `setRefreshCookie`/`clearRefreshCookie`. Cookie is
  `httpOnly`, `sameSite=strict`, `secure` in prod, scoped to `path=/api/v1/auth`.
- **`shared/utils/date.util.ts`** — added `parseDurationMs("7d")` to derive cookie max-age from
  the JWT refresh expiry config.
- **`routes/index.ts`** (new) — Aggregates module routers; mounts `authRoutes` at `/auth`.
- **`config/app.ts`** — Mounts `apiRoutes` at `/api/v1` before the 404 handler.

### Frontend files added (`client/src/`)
- **`components/ui/`** — `button`, `input`, `label`, `card`, `password-input` (show/hide toggle),
  and a lightweight **toast** system (`toast.tsx`: a Zustand store + `<Toaster/>` + imperative
  `toast.success/error/info`). Mounted once in `App.tsx`.
- **`features/auth/auth.schemas.ts`** — Zod schemas for the forms (register/login/forgot/reset),
  including a cross-field `confirmPassword` match via `.refine()`.
- **`services/auth.service.ts`** — `authApi.*` typed wrappers around the Axios instance.
- **`types/auth.types.ts`** — Frontend mirror of the backend DTOs.
- **`lib/api-error.ts`** — `getApiErrorMessage()` pulls the human message out of an AxiosError.
- **`pages/auth/*`** — Login, Register, ForgotPassword, ResetPassword, VerifyEmail — all real
  forms with react-hook-form + zodResolver + TanStack Query mutations.
- **`app/providers/AuthProvider.tsx`** — Probes `/auth/me` when a token exists; signs out on failure.

---

### 🔑 Core Concepts Explained (the important part for study)

#### 1. Password hashing with bcrypt
- We **never** store raw passwords. `hashPassword()` runs bcrypt with `BCRYPT_ROUNDS=12`.
- bcrypt is **slow by design** (a "work factor") — 12 rounds ≈ ~250ms. That slowness makes
  brute-forcing stolen hashes expensive.
- bcrypt hashes are **salted automatically** (the salt is embedded in the hash string), so two
  users with the same password get different hashes → rainbow-table attacks fail.
- Verify with `comparePassword(plain, hash)` — bcrypt re-derives and compares in constant-ish time.

#### 2. JWT access tokens
- A **JWT** (JSON Web Token) is a signed, self-contained token: `header.payload.signature`.
- Our access token payload = `{ userId, email }`, signed with `JWT_ACCESS_SECRET`, expires in
  **15 minutes** (short-lived on purpose).
- The server does **not** store access tokens. It just verifies the signature — if valid, it
  trusts the payload. This makes auth **stateless** and horizontally scalable.
- Risk of stateless: you can't "revoke" an access token before it expires. Mitigation → keep it
  short-lived (15m) and pair it with a revocable refresh token.

#### 3. Refresh tokens + **rotation** (the security centerpiece)
- Problem: 15-min access tokens would force re-login every 15 minutes. Solution: a long-lived
  (**7-day**) **refresh token** that mints new access tokens.
- Our refresh token is a JWT **and** a DB row (`RefreshToken` table). The DB row is what makes it
  **revocable** (statelessness would not allow revocation).
- **Rotation:** every time `/refresh` is called we (a) verify the incoming token, (b) mark the old
  DB row `isRevoked=true`, (c) issue a brand-new refresh token. A refresh token is therefore
  **single-use**.
- **Reuse detection:** if someone presents a refresh token that's already revoked/expired (a sign
  it was stolen and replayed), we **revoke ALL** of that user's tokens (`revokeAllUserTokens`),
  forcing a fresh login everywhere. See `auth.service.ts → refresh()`.
- Delivered as an **httpOnly cookie** → JavaScript can't read it → immune to XSS token theft.
  The access token, by contrast, lives in memory/Zustand and is sent as a `Bearer` header.

#### 4. httpOnly cookie hardening
`cookie.util.ts` sets:
- `httpOnly: true` → not readable by `document.cookie` (blocks XSS exfiltration).
- `sameSite: 'strict'` → the cookie is not sent on cross-site requests (blocks CSRF).
- `secure: true` in production → only sent over HTTPS.
- `path: '/api/v1/auth'` → the browser only attaches it to auth endpoints, nowhere else.
- In dev, the Vite proxy forwards `/api` → `localhost:5000`, so the browser sees **same-origin**
  and the strict cookie works.

#### 5. Verify-before-login flow
- On register, `isVerified=false` and a `verificationToken` (+24h expiry) is stored; an email is sent.
- `login()` throws a **403 `EMAIL_NOT_VERIFIED`** if the user hasn't verified. The frontend catches
  the 403 and shows a "Resend verification email" prompt.
- `authenticate` middleware also blocks unverified users, so even a leaked token can't be used
  pre-verification.

#### 6. No user enumeration (privacy/security)
- `forgot-password` and `resend-verification` **always return success**, whether or not the email
  exists. This prevents attackers from probing "which emails have accounts here?".
- The actual email is only sent if the account genuinely exists.

#### 7. Atomic multi-entity creation with `prisma.$transaction`
- Registering a user must also create Tenant, Family, FamilyMember, FamilySettings, Subscription.
- If any step fails, we must not end up with a half-created account. `prisma.$transaction(async tx => …)`
  makes all six inserts **all-or-nothing** (ACID). See `auth.repository.ts → createAccount()`.

#### 8. Zod validation (defense in depth)
- Backend: `validate(schema)` middleware parses `req.body`; invalid input → 422 with field errors,
  never reaching the service. It also **coerces/normalizes** (e.g., lowercases email).
- Frontend: the *same rules* run via `zodResolver` so the user gets instant feedback before any
  network call. Backend validation is still authoritative — never trust the client.

#### 9. Frontend data flow: React Hook Form + TanStack Query + Zustand
- **React Hook Form** manages form state/validation with minimal re-renders (uncontrolled inputs).
- **`zodResolver`** bridges the Zod schema into RHF so one schema drives validation + TS types
  (`z.infer`).
- **TanStack Query `useMutation`** handles the async POST: `isPending` (spinner), `onSuccess`,
  `onError`. `useQuery` (in AuthProvider) caches `/me`.
- **Zustand** (`auth.store.ts`) holds global auth state (`user`, `member`, `accessToken`) and
  **persists** it to localStorage so a refresh keeps you logged in. The access token is re-validated
  against `/me` on load.
- **Axios interceptor** (`services/api.ts`) attaches the Bearer token to every request and, on a
  401, transparently calls `/auth/refresh` once, retries the original request, and queues any
  requests that arrive mid-refresh.

#### 10. Rate limiting
- `authLimiter` = 5 attempts / 15 min on auth routes with `skipSuccessfulRequests: true` (only
  failed attempts count) → slows credential-stuffing without punishing legitimate users.

---

### ▶️ How to Run (local dev)

> Requires: Node 18+, Docker Desktop (for Postgres/Redis), and an SMTP endpoint (a mail catcher
> like **Mailhog** is easiest for dev).

1. **Start infrastructure** (Postgres + Redis) — from the repo root:
   ```bash
   docker compose up -d
   ```
   (Start Docker Desktop first if the daemon isn't running.)

2. **Create the server env file** and fill in secrets:
   ```bash
   cp server/.env.example server/.env
   ```
   Minimum edits for dev:
   - `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` → any string ≥ 32 chars.
   - SMTP → point at Mailhog: `SMTP_HOST=localhost`, `SMTP_PORT=1025`, `SMTP_SECURE=false`,
     `SMTP_USER`/`SMTP_PASS` can be anything, `EMAIL_FROM="FFM <dev@local>"`.
   - Cloudinary values can stay as placeholders (not used in Phase 1).

3. **Apply the database schema + seed:**
   ```bash
   cd server
   npm install
   npm run db:migrate      # creates tables from schema.prisma
   npm run db:sdocker compose up -deed         # optional: super-admin + demo family
   npm run dev             # starts API on http://localhost:5000
   ```

4. **Start the frontend:**
   ```bash
   cd client
   npm install
   npm run dev             # http://localhost:5173 (proxies /api → :5000)
   ```

5. Open `http://localhost:5173/register`.

**Mailhog** (recommended mail catcher) — run it and read emails at `http://localhost:8025`:
```bash
docker run -d --name mailhog -p 1025:1025 -p 8025:8025 mailhog/mailhog
```

---

### ✅ How to Test

#### A. Manual UI walkthrough (happy path)
1. **Register** at `/register` → expect the "Check your email" screen.
2. Open **Mailhog** (`:8025`) → open the verification email → click the link (or copy the
   `?token=…`) → lands on `/verify-email` → "Email verified!".
3. **Login** at `/login` → redirected to the dashboard; your name shows in the Topbar.
4. **Logout** (Topbar) → back to `/login`.
5. **Forgot password** → `/forgot-password` → check Mailhog → open reset link → set a new
   password at `/reset-password` → login with the new password.

#### B. Edge cases worth trying (to *see* the concepts work)
- Log in **before verifying** → yellow "Email not verified" banner + working "Resend" button (403 path).
- Wrong password → generic "Invalid email or password" (no hint which was wrong).
- Register the **same email twice** → 409 "account already exists".
- Weak password (`abc`) → inline Zod error, no request sent.
- Let the 15-min access token expire, then act → the Axios interceptor silently refreshes (watch
  the Network tab: a `/auth/refresh` call appears, then your original request retries).

#### C. API testing with `curl` (no UI)
```bash
# Register
curl -i -X POST http://localhost:5000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Bob","lastName":"K","familyName":"K Family","email":"bob@x.com","password":"secret123"}'

# Verify (grab token from Mailhog)
curl -i -X POST http://localhost:5000/api/v1/auth/verify-email \
  -H 'Content-Type: application/json' -d '{"token":"<TOKEN>"}'

# Login (-c saves the refresh cookie to a jar)
curl -i -c cookies.txt -X POST http://localhost:5000/api/v1/auth/login \
  -H 'Content-Type: application/json' -d '{"email":"bob@x.com","password":"secret123"}'
# → copy accessToken from the JSON body

# Me (Bearer access token)
curl -i http://localhost:5000/api/v1/auth/me -H 'Authorization: Bearer <ACCESS_TOKEN>'

# Refresh (-b sends the cookie jar) — note the new token in the response
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:5000/api/v1/auth/refresh

# Logout
curl -i -b cookies.txt -X POST http://localhost:5000/api/v1/auth/logout
```

#### D. Static checks (no infra needed)
```bash
cd server && npx tsc --noEmit     # backend type-check → should be clean
cd client && npx tsc --noEmit     # frontend type-check
cd client && npm run build        # production build sanity
```

#### E. Inspect the database (understand the data)
```bash
cd server && npm run db:studio    # Prisma Studio at http://localhost:5555
```
Look at: `users` (note `passwordHash`, `isVerified`, `verificationToken`), `refresh_tokens`
(watch rows flip `isRevoked=true` after each `/refresh`), `families`, `family_members`
(role `TENANT_OWNER`), `subscriptions` (status `TRIAL`).

---

### 🧠 Self-check questions (quiz yourself)
1. Why is the access token short-lived but the refresh token long-lived?
2. What exactly happens if a *revoked* refresh token is replayed, and why?
3. Why is the refresh token an httpOnly cookie but the access token is not?
4. Why do `forgot-password` and `resend-verification` always return success?
5. Why must account creation use a DB transaction?
6. Where does email get normalized, and why does that prevent duplicate accounts?
7. Which layer is allowed to import Prisma, and why keep it isolated?

---

## Phase 2 — Family, Members & RBAC

**Status:** ✅ Implemented (pending review)

### Overview
Turns the single-user account from Phase 1 into a real shared workspace: invite people by
email, give them a role, change or revoke that role, remove them again — all enforced by
**two layers of middleware** (tenant isolation, then permission checks) so a request can
only ever touch its own family's rows.

A user may now belong to **several** families. `User.activeFamilyId` records which one they
are currently working in, and a workspace switcher in the Topbar changes it.

### Endpoints (base `/api/v1/families`)

| Method | Path | Guard | Purpose |
|---|---|---|---|
| GET | `/invites/token/:token` | – (public) | Preview an invite before signing in |
| GET | `/` | Bearer | Workspaces I belong to |
| POST | `/switch` | Bearer | Change my active workspace |
| POST | `/join/:token` | Bearer | Accept an invitation |
| GET | `/me` | `FAMILY_VIEW` | Family + settings + counts |
| PATCH | `/me` | `FAMILY_MANAGE` | Rename the family |
| GET | `/members` | `FAMILY_VIEW` | List members |
| PATCH | `/members/:id/role` | `MEMBER_ROLE_CHANGE` | Change a member's role |
| DELETE | `/members/:id` | `MEMBER_REMOVE` | Soft-remove a member |
| POST | `/invite` | `MEMBER_INVITE` | Invite by email |
| GET | `/invites` | `MEMBER_INVITE` | Pending invitations |
| POST | `/invites/:id/resend` | `MEMBER_INVITE` | New token + new email |
| DELETE | `/invites/:id` | `MEMBER_INVITE` | Revoke an invitation |

Note the deliberate ordering in `family.routes.ts`: the public preview route is declared
**before** `router.use(authenticate)`, and join/switch sit **between** `authenticate` and
`router.use(resolveTenant)` — because someone joining a *new* family must not first be
pinned to their *old* one.

### Backend files added (`server/src/modules/family/`)
- **`family.types.ts`** — DTOs + `ASSIGNABLE_ROLES` (`FAMILY_HEAD | MEMBER | VIEWER`).
  `SUPER_ADMIN` and `TENANT_OWNER` are deliberately *not* assignable by this module.
- **`family.validator.ts`** — Zod schemas for bodies and route params.
- **`family.repository.ts`** — Every query is scoped by `familyId`. Two transactions:
  `acceptInvite` (create/reactivate member + mark invite used + switch the user in) and
  `deactivateMember` (soft-delete + clear active workspace + drop the stale invite row).
- **`family.service.ts`** — All the rules (see below).
- **`family.controller.ts`** — Thin; builds an `ActorContext` from `req.user` + `req.member`.
- **`family.routes.ts`** — Route → middleware chain → controller.

### Backend files touched
- **`prisma/schema.prisma`** — `User.activeFamilyId` (+ `activeFamily` relation),
  `Invite.invitedById` / `acceptedAt`, and `@@unique([familyId, email])` on `Invite`.
- **`middlewares/tenant.middleware.ts`** — resolves the *active* membership (one query),
  falling back to the oldest membership when `activeFamilyId` is unset or stale.
- **`modules/auth/auth.repository.ts`** — `getActiveMembership` now uses the same rule, so
  `/auth/me` and `resolveTenant` can never disagree about which family you are in.
- **`shared/constants/messages.ts`** — new `FAMILY_*` strings.
- **`routes/index.ts`** — mounts `familyRoutes` at `/families`.

### Frontend files added
- **`constants/permissions.ts`** — mirror of the server's role hierarchy + permission map.
- **`hooks/usePermission.ts`** — `can()`, `isAtLeast()`, `outranks()`, `assignableRoles`.
- **`services/family.service.ts`**, **`types/family.types.ts`** — typed API layer.
- **`features/family/`** — `family.hooks.ts` (TanStack queries/mutations),
  `family.schemas.ts`, `FamilyProfileCard`, `InviteMemberDialog`, `MembersTable`,
  `PendingInvites`, `RoleBadge`, `WorkspaceSwitcher`.
- **`components/ui/`** — `dialog` (Radix), `select` (styled native), `badge`.
- **`components/common/ConfirmDialog.tsx`** — reusable destructive-action confirmation.
- **`pages/family/FamilyPage.tsx`** — the real management screen.
- **`pages/family/AcceptInvitePage.tsx`** — `/join/:token`, works signed-in *or* signed-out.
- **`lib/redirect.ts`** — `safeRedirect()` guard for the `?redirect=` parameter.

---

### 🔑 Core Concepts Explained

#### 1. Two-layer request guarding: isolation *then* permission
```
authenticate      → who are you?            (req.user)
resolveTenant     → which family? what role? (req.member, req.familyId)
requirePermission → may that role do this?   (403 otherwise)
```
`resolveTenant` is the **tenant isolation** layer: it derives `familyId` from the *database*,
never from the request body or a query string. A client cannot ask for another family's data
because it never gets to name the family — the server decides. Every repository method then
takes that `familyId` as an explicit filter.

#### 2. Why scoped lookups matter (`findMember(familyId, memberId)`)
It would be tempting to write `prisma.familyMember.findUnique({ where: { id } })`. That is an
**IDOR** (Insecure Direct Object Reference): paste another family's member id into the URL and
you would edit their row. Passing `familyId` into the `where` clause makes a foreign id simply
resolve to `null` → 404. Same pattern for invites.

#### 3. Privilege-escalation guards (the *strictly below* rule)
Two checks in `family.service.ts`, both derived from `ROLE_HIERARCHY`:
- `assertCanAssignRole` — you may only hand out roles **strictly below your own**. A
  `FAMILY_HEAD` (60) can create `MEMBER`(40)/`VIEWER`(20) but never another `FAMILY_HEAD`.
- `assertCanManageMember` — you may only edit/remove members **strictly below your own** rank,
  and the `TENANT_OWNER` is untouchable.

Plus: you can never change your own role or remove yourself. Without the "strictly below"
rule a Family Head could promote a peer, or demote the person who invited them.

#### 4. Token-based invitations
- The invite row holds a 64-char hex `token` (`crypto.randomBytes(32)`), an expiry
  (`INVITE_EXPIRES_HOURS`, default 48h), and the target `email` + `role`.
- `@@unique([familyId, email])` + `upsert` means re-inviting the same address **refreshes**
  the existing row instead of leaving a trail of live tokens. Resending mints a *new* token,
  which silently invalidates the old link.
- Accepting requires the signed-in account's email to **match the invite** — the link alone is
  not enough, otherwise a forwarded email would let anyone in.
- Revoking is a hard delete: the link stops working immediately.

#### 5. Public preview vs. authenticated accept
`GET /invites/token/:token` is unauthenticated on purpose: the accept page has to be able to
say *"Join The Sharma Family as Member"* before it can ask you to sign in. It only ever
reveals what the person holding the link was already told in the email — and the token itself
is the secret. Accepting is a separate, authenticated call.

#### 6. Soft removal (why `isActive: false`, not `DELETE`)
Income and expense rows reference `memberId`. Deleting a member would either cascade away
their financial history or break foreign keys. So removal flips `isActive = false`, keeps the
history, and re-inviting the same person simply reactivates the row (`existingMemberId` in
`acceptInvite`).

#### 7. Multi-workspace + `activeFamilyId`
Because registration always creates a family, an invited person who already has an account
would otherwise be stuck in their own workspace. Membership is therefore many-to-many, and
`User.activeFamilyId` is the pointer that both `resolveTenant` and `/auth/me` read. Switching
workspaces on the client calls `queryClient.clear()` — every cached query was scoped to the
*old* tenant and must not be reused.

#### 8. Client-side permissions are cosmetic
`usePermission()` mirrors the server's tables so the UI never shows a button that would 403.
It is **not** a security control — the same checks run again in `requirePermission` and in the
service. Deleting the frontend check would change nothing about what is actually allowed.

#### 9. `?redirect=` and open redirects
An invite link that requires sign-in has to come back afterwards, so `/login?redirect=/join/x`
is honoured by both `LoginPage` and `GuestRoute`. `safeRedirect()` rejects anything that is
not a single-slash relative path — `//evil.com` and `https://evil.com` fall back to the
dashboard.

#### 10. Audit trail
Write routes are wrapped in `audit({ action, entity })`, so role changes, removals, invites
and renames land in the `audit_logs` table with the actor, family, IP and payload.

---

### ▶️ How to Run

The schema changed, so after pulling this phase:

```bash
cd server
npm run db:migrate      # adds users.activeFamilyId, invites.invitedById/acceptedAt + unique index
npm run dev
```
(Then `cd client && npm run dev` as in Phase 1. Mailhog at `:8025` catches invite emails.)

---

### ✅ How to Test

#### A. Manual walkthrough (two browsers or one + an incognito window)
1. Sign in as the owner → **Family** in the sidebar. Rename the workspace; copy the family code.
2. **Invite member** → enter a second email, pick *Member* → it appears under
   **Pending invitations**.
3. Open Mailhog (`:8025`) → click **Accept Invitation** → the accept page shows
   "Join <family> as Member" and asks you to sign in.
4. Register that second email in an incognito window, verify it, then click the invite link
   again → **Accept invitation** → you land on the dashboard, now inside the inviting family.
5. Back as the owner: the new person is in **Members**. Change their role to *Viewer*,
   then remove them (their row shows *Removed*).
6. The second account now belongs to two families → a **workspace switcher** appears in the
   Topbar.

#### B. Edge cases worth trying (to *see* the guards work)
- Sign in as the invited **Member** and open `/family` → no *Invite member* button, no role
  dropdowns, no pending-invites card. Hit `POST /families/invite` with curl → **403**.
- As a **Family Head**, try to assign *Family Head* → the option isn't offered, and the API
  returns 403 `You cannot assign a role equal to or above your own.`
- Try to change your **own** role or remove yourself → 403.
- Try to remove the **owner** → 403.
- Accept an invite while signed in as the *wrong* account → "Wrong account" screen (and 403
  from the API if forced).
- Revoke an invite, then open its link → "Invitation not found".
- Resend an invite, then use the **old** link → invalid (the token rotated).
- Grab a `memberId` from another family and PATCH its role → **404**, not 403 — the row is
  invisible outside its tenant.

#### C. API testing with `curl`
```bash
TOKEN=<access token from /auth/login>

curl -s http://localhost:5000/api/v1/families/me -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:5000/api/v1/families/members -H "Authorization: Bearer $TOKEN"

curl -i -X POST http://localhost:5000/api/v1/families/invite \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"email":"sister@x.com","role":"MEMBER"}'

# Public preview (no auth header at all)
curl -s http://localhost:5000/api/v1/families/invites/token/<INVITE_TOKEN>

# Accept, signed in as sister@x.com
curl -i -X POST http://localhost:5000/api/v1/families/join/<INVITE_TOKEN> \
  -H "Authorization: Bearer $SISTER_TOKEN"

curl -i -X PATCH http://localhost:5000/api/v1/families/members/<MEMBER_ID>/role \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"role":"VIEWER"}'
```

#### D. Static checks
```bash
cd server && npx tsc --noEmit
cd client && npx tsc --noEmit && npm run build
```

#### E. Inspect the database
`npm run db:studio` → look at `invites` (token, `expiresAt`, `isAccepted`, `invitedById`),
`family_members` (roles, `isActive=false` after removal), `users.activeFamilyId`, and
`audit_logs` (`INVITE_SENT`, `ROLE_CHANGED`, `DELETE`).

---

### 🧠 Self-check questions
1. Where does `familyId` come from on a request, and why never from the client?
2. Why does `findMember` take `familyId` as well as the member id?
3. Why may a Family Head not promote someone to Family Head?
4. What happens to a member's expenses when they are removed — and why?
5. Why is the invite *preview* public but *accept* authenticated?
6. Why must `queryClient.clear()` run when switching workspaces?
7. Which two places resolve "the user's active family", and why must they agree?

---

## Phase 3 — Income Module

**Status:** ✅ Implemented (pending review)

> These notes were written retrospectively, alongside Phase 4. Phase 4 (Expenses) is
> deliberately built on the same skeleton, so most of what follows applies to both — the
> ownership rules, the recurrence handling and the summary shape are shared line for line.

### Overview

The first real *financial* module: money coming in, attributed to a family member, optionally
repeating on a schedule. It establishes the pattern every later finance module copies —
filtered/paginated list, a period summary with breakdowns, and a two-tier permission model
where the route guards the **verb** and the service guards the **row**.

### Endpoints (base `/api/v1/income`)

| Method | Path | Guard | Purpose |
|---|---|---|---|
| GET | `/summary` | `FINANCE_VIEW` | Period totals, breakdowns, 12-month trend |
| GET | `/recurring` | `FINANCE_VIEW` | Recurring entries with their next due date |
| GET | `/` | `FINANCE_VIEW` | Filtered, sorted, paginated list |
| GET | `/:id` | `FINANCE_VIEW` | One entry |
| POST | `/` | `FINANCE_WRITE` | Add |
| PATCH | `/:id` | `FINANCE_WRITE` | Update |
| DELETE | `/:id` | `FINANCE_WRITE` | Delete |

`router.use(authenticate, resolveTenant)` sits above all of them, so every query is already
pinned to the caller's active family before a handler runs. Note the ordering: `/summary` and
`/recurring` are declared **before** `/:id`, or Express would read the literal word "summary"
as an income id.

`DELETE` is guarded by `FINANCE_WRITE`, not `FINANCE_DELETE`, so a member can remove an entry
they added by mistake. Deleting *someone else's* row still needs a family head — enforced in
the service, not the route.

### Backend files added

**`server/src/modules/income/`**
- **`income.types.ts`** — Inputs, DTOs, `INCOME_SORT_FIELDS`.
- **`income.validator.ts`** — Zod schemas for body, query and params.
- **`income.repository.ts`** — All Prisma access, including the aggregations.
- **`income.service.ts`** — Ownership rules, recurrence merging, DTO mapping, the summary.
- **`income.controller.ts`** / **`income.routes.ts`** — Thin handlers and wiring.

**Shared additions**
- **`shared/types/actor.ts`** — `ActorContext`: the acting member as a plain object.
- **`shared/utils/request.util.ts`** — `actorFrom(req)` and `param(req, name)`.
- **`shared/utils/recurrence.util.ts`** — `advance()` and `nextOccurrence()`.

### Frontend files added
- **`types/api.types.ts`** — `ApiEnvelope`, `PaginationMeta`, `unwrap()`.
- **`types/income.types.ts`**, **`services/income.service.ts`** — typed API layer.
- **`features/income/`** — `income.constants.ts`, `income.schemas.ts`, `income.hooks.ts`,
  `IncomeStats`, `IncomeFilters`, `IncomeTable`, `IncomeFormDialog`, `IncomeBreakdown`,
  `RecurringIncomePanel`, `PeriodSelector` *(moved to `components/common/` in Phase 4)*.
- **`components/common/Pagination.tsx`**, **`components/ui/textarea.tsx`**.
- **`hooks/useCurrency.ts`** (formatters bound to the family's configured currency),
  **`hooks/useDebounce.ts`**.
- **`utils/formatCurrency.ts`**, **`utils/formatDate.ts`**.

---

### 🔑 Core Concepts Explained

#### 1. Money is a `Decimal`, never a float
The column is `Decimal(12, 2)`; Prisma hands back a `Prisma.Decimal`, and the repository keeps
it that way. Binary floating point cannot represent `0.1` exactly, so adding thousands of
amounts as JS numbers drifts by cents — and a ledger that is "nearly right" is worthless.

The conversion happens once, at the DTO boundary:
```ts
const toNumber = (value: Prisma.Decimal): number => Number(value.toFixed(2));
```
Two decimal places always fit a double exactly, so the number that crosses the wire is safe.
All *arithmetic* stays in Postgres or in `Decimal`; JS only ever sees the finished figure.

#### 2. Validating "at most 2 decimal places"
```ts
.refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6)
```
The obvious test — is `value * 100` a whole number? — does not work, because
`19.99 * 100` evaluates to `1998.9999999999998`. The check therefore asks whether the product
is *within a whisker of* its own rounding, which is true for `19.99` and false for `19.999`.

#### 3. `ActorContext` — keeping services free of HTTP
Controllers call `actorFrom(req)`, which assembles `{userId, memberId, familyId, role, …}`
from what `authenticate` and `resolveTenant` attached. Services take that object and never
touch `req`. That is what makes the service layer unit-testable without an HTTP server, and
it is why `familyId` can never be read from a request body by accident.

#### 4. Two different checks: the verb and the row
```
requirePermission('FINANCE_WRITE')   → may this role write income at all?     (route)
assertCanMutate(actor, row)          → may this person change THIS row?       (service)
```
The route guard is coarse: `MEMBER` and above may write. The row guard is where the real rule
lives — you may always change your own entry, and changing someone else's needs
`FAMILY_HEAD` or above (`isLedgerManager`). Putting the second check in middleware would not
work: the middleware has not loaded the row yet.

#### 5. Attribution is a privileged act (`resolveOwner`)
Posting income "on behalf of" another member is a ledger-manager action. `resolveOwner`:
1. defaults to the caller when `memberId` is absent or is the caller's own;
2. rejects non-managers with 403;
3. looks the target up **scoped by `familyId`**, so a member id from another family resolves
   to `null` → 404 (the IDOR guard from Phase 2, applied again here);
4. rejects members who have been soft-removed (`isActive: false`).

#### 6. Recurrence is *derived*, never materialised
An entry marked recurring does **not** spawn future rows. `nextOccurrence(start, frequency)`
computes the next date on read, and the UI labels it "Next in 12 days". Nothing writes future
income until the scheduler lands in Phase 12. This keeps the ledger honest: it contains what
actually happened, not what is expected to.

#### 7. The month-clamping trap in `recurrence.util.ts`
A monthly series starting **31 January** is the classic date bug. Stepping one month at a time
from the *previous* occurrence gives 31 Jan → 28 Feb → 28 Mar → 28 Apr: the 31st is lost
forever after the first February.

The fix is to compute every candidate from the original `start` with a multiplied offset —
`start + k months` — so February clamps to the 28th and March still comes back to the 31st.
`addMonths` does the clamping explicitly:
```ts
result.setDate(1);                       // avoid rolling over while changing month
result.setMonth(result.getMonth() + months);
result.setDate(Math.min(day, lastDayOfThatMonth));
```
The number of steps is also *calculated* rather than looped, so a daily series started in 2015
costs the same as a monthly one started last week.

#### 8. Merging a partial update (`resolveRecurrence`)
`PATCH {isRecurring: true}` with no `frequency` is valid — the frequency should come from the
stored row. The request validator cannot know that, because it only sees the payload. So the
service re-derives the pair against the existing record, and a one-off always stores
`Frequency.ONCE` rather than `null`, so the column has one meaning instead of two.

#### 9. "Not supplied" vs "cleared" — `'description' in input`
```ts
if (input.type !== undefined) data.type = input.type;      // not supplied → skip
if ('description' in input) data.description = input.description ?? null;   // cleared → null
```
An absent key means *leave it alone*; a key present but empty means *erase it*. Zod keeps the
key in its output when the input had it, even when the value transforms to `undefined`, which
is exactly what makes this distinction survive validation. The client cooperates by sending
`description: ''` rather than omitting it.

#### 10. Deterministic pagination needs a tiebreaker
```ts
[{ date: sortOrder }, { createdAt: 'desc' }]
```
Sorting only by `date` leaves rows that share a date in an undefined order, and Postgres is
free to return them differently on each query — so a row can appear on both page 1 and page 2,
or on neither. The second, unique-ish key makes the ordering total.

#### 11. `filteredTotal` — the sum of the match, not the page
The list endpoint runs three queries in one `prisma.$transaction`: the page of rows, the
count, and a `_sum` over the *same* `where`. That is why the table can say "34 matching
entries · Total ₹82,400" when only 20 rows are on screen — and why the count can never
disagree with the rows, since all three see the same snapshot.

#### 12. Aggregating in SQL, not in Node
`monthlyTotals` is the one raw query in the module:
```sql
SELECT EXTRACT(MONTH FROM "date")::int AS month, COALESCE(SUM("amount"), 0) AS total
FROM "incomes" WHERE "familyId" = $1 AND "date" BETWEEN $2 AND $3 GROUP BY 1 ORDER BY 1
```
Fetching a year of rows just to add them up would scale with the family's history; grouping in
Postgres scales with the *answer* (12 rows). Two things to notice: the parameters are still
bound (`$queryRaw` with a tagged template is parameterised — string interpolation here would
be an injection hole), and raw results bypass Prisma's type mapping, so the driver's output is
re-wrapped in `Prisma.Decimal` before use. The result is padded to all 12 months so the chart
never has gaps.

#### 13. `groupBy` cannot join, so names are fetched separately
`prisma.groupBy({by: ['memberId']})` returns ids and sums, no relations. The repository then
loads the matching members in a second query and stitches them together in memory. A member
who was removed still has income rows, so the service labels the missing name **"Former
member"** rather than dropping the row and silently under-reporting the total.

#### 14. Growth from zero is `null`, not `Infinity`
```ts
changePercent: previousTotal === 0 ? null : percentOf(total - previousTotal, previousTotal)
```
Dividing by a zero baseline is mathematically undefined, not "+∞%" and not "+100%". The API
sends `null` and the UI simply hides the trend badge.

#### 15. Client: `keepPreviousData` and resetting the page
`placeholderData: keepPreviousData` keeps the old rows on screen while a new page or filter
loads, so the table does not flash empty. And a `useEffect` on the debounced search term
resets `page` to 1 — otherwise typing a new search while on page 4 asks for page 4 of a result
set that may only have one page.

#### 16. Client: invalidate the prefix, not the query
Every income write calls `invalidateQueries({queryKey: ['income']})`. A new entry changes the
list, the summary, the recurring panel and the dashboard; enumerating those by hand is a bug
waiting to happen the next time a query is added.

#### 17. Client: `isOwn` comes from the server
The DTO carries `isOwn: row.memberId === actor.memberId`, so the table does not have to know
the caller's member id. It is used only to decide whether to *render* edit and delete — the
same rule is enforced again in `assertCanMutate`. Deleting the client check would change
nothing about what is actually permitted.

---

### ▶️ How to Run

Phase 3 shipped with the repository's first migration, so from a clean checkout:

```bash
cd server && npm run db:migrate && npm run dev
cd client && npm run dev
```

Then **Income** in the sidebar. No third-party credentials are needed for this module.

---

### ✅ How to Test

#### A. Manual walkthrough
1. **Income** → four stat cards and two breakdown cards, all empty.
2. **Add income** → type *Salary*, an amount, today's date, description "October salary".
   It appears in the table with a green amount and a *Salary* badge.
3. Add a second entry, tick **This income repeats** → *Monthly*. A **Recurring income** panel
   appears above the table showing the next due date.
4. Change the **period selector** to *Whole year* → the stat cards and breakdowns recompute.
5. Filter by type, by member, by date range; switch the sort to *Highest amount*.
6. Note the strip above the table: *"N matching entries · Total ₹X"* — that total covers the
   whole filtered set, not just the visible page. Add a 21st entry to see paging appear.

#### B. Edge cases worth trying (to *see* the guards work)
- Enter `19.999` → inline "At most 2 decimal places", no request sent. `19.99` is accepted.
- Enter `0` or a negative amount → "Amount must be greater than zero".
- Tick *repeats* but leave the frequency blank → the field errors before submitting; forcing it
  through the API returns 422 `Choose how often this income repeats`.
- Set a recurring entry's start date to **31 January**, frequency *Monthly* → the next
  occurrence lands on the 28th/29th in February but returns to the 31st in March.
- Sign in as a **Member** and edit an entry someone else added → 403
  `You can only change income entries you added.` As a **Viewer**, no *Add income* button and
  no row actions at all.
- As a Member, try to post income for another member (`memberId` in the body) → 403
  `You can only add income for yourself.`
- Take an income id from another family and `GET /income/<id>` → **404**, not 403.
- Set a date range where *To* precedes *From* → 422 on the `to` field.
- Remove a member who has income, then reopen the summary → their rows are still counted,
  labelled **Former member**.

#### C. API testing with `curl`
```bash
TOKEN=<access token from /auth/login>

curl -i -X POST http://localhost:5000/api/v1/income \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"type":"SALARY","amount":85000,"date":"2026-07-01","description":"July salary","isRecurring":true,"frequency":"MONTHLY"}'

curl -s "http://localhost:5000/api/v1/income?type=SALARY&from=2026-01-01&perPage=5" \
  -H "Authorization: Bearer $TOKEN"

curl -s "http://localhost:5000/api/v1/income/summary?year=2026&month=7" -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:5000/api/v1/income/recurring -H "Authorization: Bearer $TOKEN"

curl -i -X PATCH http://localhost:5000/api/v1/income/<ID> \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"description":""}'      # cleared, not "unchanged" — the field becomes null
```

#### D. Static checks
```bash
cd server && npx tsc --noEmit
cd client && npx tsc --noEmit && npm run build
```

#### E. Inspect the database
`npm run db:studio` → `incomes` (note `amount` as a numeric, `frequency` = `ONCE` on one-off
entries rather than `NULL`, and `memberId` pointing at `family_members`, not `users`), plus
`audit_logs` for the `Income` entity.

---

### 🧠 Self-check questions
1. Why is `amount` kept as a `Decimal` all the way to the DTO boundary?
2. Why does the two-decimal check compare against a rounding instead of testing for an integer?
3. Which check lives on the route and which lives in the service — and why can't they swap?
4. What are the four things `resolveOwner` verifies before attributing an entry to someone else?
5. Why does a monthly series starting on the 31st need every date computed from `start`?
6. Why must the service re-derive `isRecurring`/`frequency` when the validator already ran?
7. How does the API tell "leave the description alone" apart from "clear the description"?
8. What breaks if the list is ordered by `date` alone?
9. Why is `monthlyTotals` a raw SQL query, and why is its result re-wrapped in `Prisma.Decimal`?
10. Why does `changePercent` return `null` rather than a number when the previous period was zero?

---

## Phase 4 — Expense Module

**Status:** ✅ Implemented (pending review)

### Overview

The mirror image of income, plus the four things spending needs that earning does not:
**categories** (a two-level tree), **receipts** (file upload to Cloudinary), **CSV
import/export**, and a much richer **filter set** (category, payment method, tag, amount
range, uncategorised-only).

Ownership and tenancy rules are identical to income: every row is pinned to `familyId`,
members may only mutate their own entries, and family heads and the owner may mutate anyone's.

### Endpoints (base `/api/v1/expenses`)

| Method | Path | Guard | Purpose |
|---|---|---|---|
| GET | `/categories` | `FINANCE_VIEW` | Category tree (seeds defaults if the family has none) |
| POST | `/categories` | `FINANCE_WRITE` | Create a category or subcategory |
| PATCH | `/categories/:id` | `FINANCE_WRITE` | Rename / recolour / re-parent |
| DELETE | `/categories/:id` | `FINANCE_DELETE` | Delete (expenses survive, uncategorised) |
| GET | `/export` | `FINANCE_VIEW` | CSV of the current filter selection |
| POST | `/import` | `FINANCE_WRITE` | CSV import (multipart) |
| GET | `/summary` | `FINANCE_VIEW` | Totals + four breakdowns + 12-month trend |
| GET | `/recurring` | `FINANCE_VIEW` | Recurring entries with next due date |
| GET | `/` | `FINANCE_VIEW` | Filtered, sorted, paginated list |
| GET | `/:id` | `FINANCE_VIEW` | One expense |
| POST | `/` | `FINANCE_WRITE` | Add |
| PATCH | `/:id` | `FINANCE_WRITE` | Update (ownership re-checked in the service) |
| DELETE | `/:id` | `FINANCE_WRITE` | Delete (+ its Cloudinary assets) |
| POST | `/:id/receipt` | `FINANCE_WRITE` | Attach a receipt (multipart) |
| DELETE | `/:id/receipts/:receiptId` | `FINANCE_WRITE` | Detach a receipt |

Route order matters: `/categories`, `/export`, `/import`, `/summary` and `/recurring` are all
declared **before** `/:id`, or Express would read the literal word "summary" as an expense id.

### Backend files added

**`server/src/modules/expense/`**
- **`expense.types.ts`** — DTOs, inputs, and the constants that bound the module
  (`PAYMENT_METHODS`, `MAX_TAGS`, `MAX_RECEIPTS_PER_EXPENSE`, `MAX_IMPORT_ROWS`,
  `MAX_EXPORT_ROWS`).
- **`expense.validator.ts`** — Zod schemas for expenses *and* categories.
- **`expense.repository.ts`** — All expense/receipt Prisma access + the aggregations.
- **`category.repository.ts`** — Category queries, including `ensureDefaults`.
- **`expense.service.ts`** — Ownership rules, recurrence merge, CSV orchestration, uploads.
- **`category.service.ts`** — Tree building and the nesting/duplicate/delete rules.
- **`expense.controller.ts`** / **`category.controller.ts`** — Thin handlers.
- **`expense.csv.ts`** — Row ⇄ expense mapping, header aliasing, date/amount/method parsing.

**Shared additions**
- **`shared/utils/csv.util.ts`** — A ~90-line RFC 4180 reader/writer (no new dependency).
- **`shared/validators/field.validator.ts`** — `amountSchema`, `dateSchema`, `idSchema`,
  `optionalText`, `flexibleBoolean`, `booleanQuery`. **Income was refactored onto this**, so the
  money/date rules now live in exactly one place.
- **`shared/constants/categories.ts`** — `DEFAULT_EXPENSE_CATEGORIES`, the single source the
  seed, registration and `ensureDefaults` all read.
- **`middlewares/upload.middleware.ts`** — Multer (memory storage) for receipts and CSVs.
- **`shared/utils/cloudinary.util.ts`** — `uploadBufferToCloudinary` added.
- **`modules/auth/auth.repository.ts`** — registration now creates the default categories too.

### Frontend files added
- **`types/expense.types.ts`**, **`services/expense.service.ts`** — typed API layer.
- **`features/expenses/`** — `expense.constants.ts`, `expense.schemas.ts`, `expense.hooks.ts`,
  `ExpenseStats`, `ExpenseFilters`, `ExpenseTable`, `ExpenseFormDialog`, `ExpenseBreakdown`,
  `CategoryManagerDialog`, `ReceiptsDialog`, `ImportExpensesDialog`.
- **`pages/expenses/ExpensesPage.tsx`** — the real screen.
- **`components/common/PeriodSelector.tsx`** — moved out of `features/income/` so both
  modules share one control.

---

### 🔑 Core Concepts Explained

#### 1. Why there is no migration in this phase
`Expense`, `ExpenseCategory` and `Receipt` were all defined back in Phase 0. Everything here
is built on the existing schema, so `npm run db:migrate` has nothing to do. The one behaviour
that *looks* like a schema change — default categories — is data, not structure.

#### 2. Two-level categories, enforced in the service
`ExpenseCategory` self-relates (`parent`/`children`), which the schema would happily let you
nest ten deep. The product rule is two levels, and it is enforced by one check in
`assertUsableParent`: **a parent must itself be top-level**. That single rule also makes
cycles impossible — a category can never be reached from its own descendant, because
descendants can't have children.

Moving a category that *already has* children under a parent is rejected for the same reason.

#### 3. Deleting a category never deletes money
`Expense.categoryId` is `onDelete: SetNull`. Deleting "Food & Dining" leaves every expense in
place and simply uncategorises it — the family's totals do not move. The API says so in the
response message (`"3 expenses are now uncategorised."`) so the user isn't left guessing.
Subcategories are the one thing that blocks a delete: orphaning them would silently promote
them to the top level.

#### 4. Filtering a parent includes its children
Selecting "Food & Dining" when the spending is actually filed under "Food & Dining › Groceries"
must not return nothing. `scopedWhere` expands a category filter to
`categoryId = X OR category.parentId = X`.

Watch the interaction with search: both want the `OR` key, so when a search term is also
present the two are combined under `AND: [{OR: category…}, {OR: search…}]`. Writing
`where.OR` twice would silently drop the first one.

#### 5. Files never touch the disk
Multer is configured with `memoryStorage()`. Receipts go from the request buffer straight to
Cloudinary via `upload_stream`; CSVs are parsed from the buffer and dropped. No temp files
means no cleanup job and no half-processed upload sitting in `/tmp`.

Multer reports its own failures (file too large, wrong field) as `MulterError`, which the
global handler would turn into an opaque 500 — `buildUploader` catches them and re-throws
`ValidationError`, so the client gets the same 422 field-error shape Zod produces.

#### 6. Orphaned assets: the delete you have to remember
`Receipt` rows cascade away with their expense, but **Cloudinary knows nothing about your
database**. Without `destroyAssets`, every deleted expense would leave its images in the
account forever. It runs after the DB delete and swallows failures — a stranded image is a
much smaller problem than an expense that refuses to be deleted.

#### 7. CSV, and why there's no library
The format is: commas separate fields, quotes wrap fields containing commas, and `""` is a
literal quote. That is ~40 lines to read and ~10 to write. The interesting parts are the
edge cases, all of which are covered in `csv.util.ts`:
- a **UTF-8 BOM** at the start of the file (Excel writes one) would otherwise corrupt the
  first header name;
- **CSV injection** — a description of `=HYPERLINK("http://evil")` *executes* when the export
  is opened in Excel, so any cell starting `= + - @` is prefixed with an apostrophe;
- the export is written with a BOM and CRLF, which is what makes Excel read `₹` correctly.

#### 8. Dates in CSV are UTC midnight — deliberately
The API stores dates as UTC midnight (`z.coerce.date()` on `"2026-07-01"` yields
`2026-07-01T00:00:00Z`). The importer must match: `new Date(y, m, d)` builds **local**
midnight, which in IST is `2026-06-30T18:30:00Z` — a day earlier on export, and the wrong
bucket in `monthlyTotals`, whose SQL does `EXTRACT(MONTH FROM "date")` on the stored UTC
value. `buildDate` therefore uses `Date.UTC`. **This was a real bug caught while testing.**

Only unambiguous date formats are accepted — ISO `YYYY-MM-DD` and day-first `DD/MM/YYYY`.
`01/07/2026` is July 1st, never January 7th; guessing would file expenses in the wrong month
silently.

#### 9. Partial imports are a feature
A 200-row file with three bad dates lands **197 expenses** plus a precise list of the three
lines to fix. Rejecting the whole file would force the user to fix everything blind.
`readImportRows` therefore returns `{rows, errors}` and never throws for a bad row — it only
throws when the *header* is unusable, because then nothing can be read at all.

Every imported row is attributed to the importer. Bulk-assigning other people's spending is
not something a CSV should be able to do.

#### 10. Export means "what I'm looking at"
`GET /expenses/export` reuses the exact list filters, so the file matches the table on screen.
It is capped at `MAX_EXPORT_ROWS` (5000) and returns `X-Exported-Rows` / `X-Matching-Rows`
headers, because truncation is otherwise invisible in a file download.

Its guard is `FINANCE_VIEW`, not `REPORTS_EXPORT`: it contains nothing the caller cannot
already read page by page through `GET /expenses`.

#### 11. Default categories, created in three places from one list
An expense form with an empty category picker is useless, so a family must never have zero
categories. `DEFAULT_EXPENSE_CATEGORIES` is created by (a) the seed, (b) the registration
transaction, and (c) `ensureDefaults`, which self-heals families that registered before this
phase existed. The count is re-checked *inside* a transaction so two requests racing on a
first page load can't both seed.

#### 12. The stale-dialog trap (frontend)
`ReceiptsDialog` is handed the expense resolved from the **live query data** by id, not a copy
saved into state when the dialog opened:
```tsx
const receiptTarget = expenses.find((e) => e.id === receiptTargetId) ?? null;
```
Had the page stored the object, uploading a receipt would invalidate and refetch the list, but
the open dialog would still be showing the snapshot taken before the upload — the new receipt
would appear only after closing and reopening.

#### 13. Colour is never the only signal
Category swatches in the table and manager show the category's **icon or first letter** inside
the coloured tile, and every breakdown row states its label, amount and percentage in text.
The bars are scaled against the leading row, so rank is readable without reading colour.

---

### ▶️ How to Run

**No migration is needed** — no schema changed this phase.

```bash
cd server && npm run dev
cd client && npm run dev
```

Receipt upload is the one feature that needs real credentials: set `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in `server/.env` (a free Cloudinary account is
enough). Everything else in the phase works with the placeholder values.

Families created before this phase get their default categories the first time the Expenses
page loads.

---

### ✅ How to Test

#### A. Manual walkthrough
1. **Expenses** in the sidebar → the four stat cards and four breakdown cards render empty.
2. **Categories** → the ten defaults are listed. Create *Groceries* with **Food & Dining** as
   its parent; it appears indented beneath it.
3. **Add expense** → amount, description, pick *Food & Dining › Groceries*, method *UPI*,
   tags `groceries, weekly`. It appears in the table with its colour swatch and tag badges.
4. Click the **paperclip** on that row → upload a photo → the badge shows `1`.
5. **Filter** by category *Food & Dining* → the Groceries expense still matches (parent
   expansion). Filter by tag `groceries`, by amount range, by *Uncategorised*.
6. **Export** → open the CSV in a spreadsheet; the columns match what you see.
7. **Import** → *Download a template*, add two rows, upload it → the result panel reports how
   many landed and lists any skipped lines.

#### B. Edge cases worth trying (to *see* the guards work)
- Create a subcategory of a subcategory → the parent dropdown only ever offers top-level
  categories, and the API returns 422 `Choose a top-level category as the parent.`
- Give a category with children a parent → 422 `Categories can only be nested one level deep.`
- Two categories with the same name under the same parent → 422. The same name under
  *different* parents → allowed.
- Delete a category that has subcategories → 422 `Move or delete its subcategories first.`
- Delete one that has expenses → succeeds; the toast says how many are now uncategorised, and
  they are still in the table under *Uncategorised* with the totals unchanged.
- Upload a 10 MB file → 422 `File is too large. The limit is 5 MB.` (not a 500).
- Upload a `.exe` → 422 listing the accepted types.
- Attach a 6th receipt → 422 `An expense can hold at most 5 receipts.`
- Sign in as a **Member** and edit someone else's expense → 403
  `You can only change expenses you added.` As a **Viewer**, no write buttons at all.
- Import a file whose header lacks an Amount column → 422 naming the required columns.
- Import a row dated `2026-02-29` → that one line is skipped and reported; the rest import.
- Put `=1+1` in a description, then export → the cell reads `'=1+1`, not a live formula.

#### C. API testing with `curl`
```bash
TOKEN=<access token from /auth/login>

curl -s http://localhost:5000/api/v1/expenses/categories -H "Authorization: Bearer $TOKEN"

curl -i -X POST http://localhost:5000/api/v1/expenses \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"amount":2450.5,"description":"Weekly groceries","date":"2026-07-01","paymentMethod":"UPI","tags":["groceries"],"isRecurring":false}'

curl -s "http://localhost:5000/api/v1/expenses?from=2026-07-01&to=2026-07-31&minAmount=1000" \
  -H "Authorization: Bearer $TOKEN"

curl -s "http://localhost:5000/api/v1/expenses/summary?year=2026&month=7" -H "Authorization: Bearer $TOKEN"

# Export (note the two X- headers reporting truncation)
curl -i "http://localhost:5000/api/v1/expenses/export?from=2026-07-01" -H "Authorization: Bearer $TOKEN"

# Import
curl -i -X POST http://localhost:5000/api/v1/expenses/import \
  -H "Authorization: Bearer $TOKEN" \
  -F 'file=@expenses.csv' -F 'createMissingCategories=true'

# Receipt
curl -i -X POST http://localhost:5000/api/v1/expenses/<EXPENSE_ID>/receipt \
  -H "Authorization: Bearer $TOKEN" -F 'receipt=@bill.jpg'
```

#### D. Static checks
```bash
cd server && npx tsc --noEmit
cd client && npx tsc --noEmit && npm run build
```

#### E. Inspect the database
`npm run db:studio` → `expense_categories` (note `parentId` and `isDefault`), `expenses`
(`tags` as a Postgres array, `categoryId` going `null` after a category delete), `receipts`
(`cloudinaryId` is the handle used to destroy the asset), and `audit_logs` for the
`Expense` / `ExpenseCategory` / `Receipt` entities.

---

### 🧠 Self-check questions
1. Why did this phase need no migration, and what *would* have forced one?
2. Which single rule keeps the category tree two levels deep, and why does it also prevent cycles?
3. What happens to a family's spending totals when a category is deleted — and why?
4. Why does filtering by a parent category need an `OR`, and what breaks if a search term is
   also present?
5. Where do uploaded files live between the request and Cloudinary, and why not on disk?
6. What leaks if `destroyAssets` is removed, and why is its failure swallowed?
7. Why must the CSV importer build dates with `Date.UTC` rather than `new Date(y, m, d)`?
8. Why is `01/07/2026` read as 1 July and `07/01/2026` *also* read as 1 July?
9. Why does a bad row not abort the whole import, but a bad header does?
10. Why is `ReceiptsDialog` given an expense looked up from query data instead of one held in
    component state?

---

## Phase 5 — Budget Planning

**Status:** ✅ Implemented (pending review)

### Overview

A monthly spending limit per category — plus one optional family-wide cap — and a
**budget-vs-actual** view that reads the limits against real expenses. When an expense pushes a
line past 75% or over 100%, a notification is raised.

This is the first module that *reads across* another module: budgets are meaningless without
expenses, so `budget.service` consumes `expenseRepository`. It is also the first phase with a
permission of its own.

### Endpoints (base `/api/v1/budgets`)

| Method | Path | Guard | Purpose |
|---|---|---|---|
| GET | `/vs-actual` | `FINANCE_VIEW` | Every line, plus spending no budget covers |
| GET | `/` | `FINANCE_VIEW` | The raw budget rows for a month |
| POST | `/copy` | `BUDGET_MANAGE` | Carry one month's limits into another |
| POST | `/` | `BUDGET_MANAGE` | Set a category limit, or the family-wide cap |
| PATCH | `/:id` | `BUDGET_MANAGE` | Change the amount |
| DELETE | `/:id` | `BUDGET_MANAGE` | Remove the limit (spending is untouched) |

`/vs-actual` and `/copy` are declared before `/:id`, as always.

### Backend files added (`server/src/modules/budget/`)
- **`budget.types.ts`** — DTOs plus `BUDGET_WARNING_THRESHOLD`.
- **`budget.validator.ts`** — Zod schemas. Month/year defaults are **functions**.
- **`budget.repository.ts`** — Budget queries and the copy transaction.
- **`budget.service.ts`** — Duplicate rules, the vs-actual roll-up, `statusFor`.
- **`budget.alert.ts`** — The over-budget notification trigger (5.3).
- **`budget.controller.ts`** / **`budget.routes.ts`** — Thin handlers and wiring.

### Files touched
- **`shared/utils/date.util.ts`** — `periodRange()` added, now **UTC-based** (see concept 6).
- **`modules/{income,expense}/*.repository.ts`** — both now use that one `periodRange`.
- **`modules/expense/expense.repository.ts`** — `groupByCategory` also selects `parentId` and
  `icon`, which the roll-up needs.
- **`modules/expense/expense.service.ts`** — fires `runBudgetCheck` after a create/update.
- **`shared/constants/permissions.ts`** + the client mirror — new `BUDGET_MANAGE`.

### Frontend files added
- **`types/budget.types.ts`**, **`services/budget.service.ts`**.
- **`features/budget/`** — `budget.hooks.ts`, `budget.schemas.ts`, `budget.constants.ts`,
  `BudgetProgress`, `BudgetLines`, `BudgetFormDialog`, `CopyBudgetsDialog`, `UnbudgetedPanel`.
- **`pages/budget/BudgetPage.tsx`** — the planner.

---

### 🔑 Core Concepts Explained

#### 1. Setting a limit is not the same act as recording a spend
Every finance module so far used `FINANCE_WRITE`, which includes `MEMBER`. Budgets get their
own **`BUDGET_MANAGE`** (owner + family head): a member should be able to log what they spent
without being able to decide what everyone is allowed to spend. Reads stay on `FINANCE_VIEW` —
a viewer can see how the household is tracking.

#### 2. A parent budget absorbs its children
Budget "Food & Dining" while the spending is actually filed under "Food & Dining › Groceries",
and a naive query reports **zero spent**. `spentAgainst` therefore matches a line's own
category *and* anything whose `parentId` points at it — the same expansion the expense list
does for its category filter.

#### 3. …which means the lines cannot simply be summed
Budget *both* a parent and its child and the child's spending legitimately appears on both
lines. Adding the lines up would then double-count it. So `totals.spent` is the independent
sum of **all** expenses in the period, never the sum of the rows above it:

```ts
spent: spending.total,   // not categories.reduce(...)
```

The test scenario for this is deliberate: Food 10k (11k spent, incl. its child), Groceries 6k
(8k spent), Transport 5k (6k spent) — the lines add to 25k, while the truth is 20k.

#### 4. "Unbudgeted" is what makes the page honest
Without it a family can look perfectly on track purely because the categories they overspend in
were never budgeted. Any category with spending, whose own line *and* whose parent's line are
both absent, is listed separately along with uncategorised spending.

Note what deliberately does **not** count as covering a category: the family-wide cap. Its
whole purpose is to sit above categories that have no individual plan, so if it silenced the
unbudgeted list it would defeat the point of the panel.

#### 5. NULL is not equal to NULL — the constraint that half-works
The schema carries `@@unique([familyId, categoryId, month, year])`, which fully enforces
"one budget per category per month". It does **not** enforce one family-wide budget per month,
because `categoryId` is nullable and Postgres treats every NULL as distinct — two rows with
`categoryId IS NULL` do not collide.

So that case is checked in the service (`findForPeriod`) and returns a 409. A partial unique
index (`… WHERE "categoryId" IS NULL`) would enforce it in the database, but Prisma cannot
express one in the schema, and a hand-written one drifts out of the model — the next
`migrate dev` would generate a `DROP INDEX`. The residual risk is two simultaneous
"create the overall budget" requests producing a duplicate row, which is visible and
deletable. **A known, accepted gap — not an oversight.**

#### 6. What *is* a month? (a real bug, fixed across three modules)
Dates are stored at **UTC midnight** — the API takes `yyyy-MM-dd` and `z.coerce.date()` makes
`2026-07-01T00:00:00Z`. But `periodRange` was building its boundaries in **local** time:

```ts
new Date(2026, 6, 1)   // IST → 2026-06-30T18:30:00Z
```

For UTC+X that happens to work (the window opens early and closes late, so UTC-midnight dates
still fall inside). West of Greenwich it does not: in UTC−5 the July window opens at
`2026-07-01T05:00Z`, so an expense stamped `2026-07-01T00:00Z` **misses July and lands in
June**. Income has carried this since Phase 3.

A budget is *defined* by its month, so this was worth fixing rather than documenting.
`periodRange` now lives once in `date.util.ts`, is built with `Date.UTC`, and income, expenses
and budgets all share it. The raw `monthlyTotals` queries use it too, so the SQL
`EXTRACT(MONTH …)` buckets line up with the API's idea of a month.

> This changed Phase 3 and Phase 4 behaviour. In Asia/Kolkata — the app's default timezone —
> the numbers are identical before and after; the fix only shows up on servers at a negative
> UTC offset.

#### 7. Two things move a budget line, so two things trigger the check
Spending more is the obvious one. **Lowering the limit is the other** — and it is the more
common one in practice, because budgets get set *mid-month*, against money that has already
gone out. `runBudgetCheck` therefore fires after an expense write **and** after a budget
create or amount change.

> This was found by running the thing. The first version only hooked expense writes, so the
> most ordinary flow there is — "we've spent ₹6,000 on fuel, let's cap it at ₹5,000" — set the
> budget and said nothing at all.

#### 8. The alert lives in its own file to avoid a cycle
`expense.service` calls the check after a write, and so does `budget.service`. But
`budget.service` reads `expenseRepository`, so if the check lived there the imports would
close a loop.

`budget.alert.ts` therefore imports only *repositories* and pure helpers — and `statusFor` /
`percentUsedOf` were moved out of the service into `budget.types.ts` (a leaf with no module
imports) precisely so both sides can share them:

```
expense.service → budget.alert → expense.repository     ✅ a chain
budget.service  → budget.alert → budget.types           ✅ a chain
budget.service  → budget.alert → budget.service         ❌ the cycle that was avoided
```

#### 9. A warning must never fail the write
`runBudgetCheck` is fire-and-forget: it is not awaited, and it swallows and logs. Failing to
warn someone about a budget is a much smaller problem than refusing to record what they spent.
Same reasoning as the audit middleware and the Cloudinary cleanup in Phase 4.

#### 10. Notify once per budget, per threshold — ever
Without a guard, *every* subsequent expense on an overspent category fires another alert. The
budget id is a sufficient key on its own, because a budget row is already unique per category
**and** period — so `metadata.budgetId` plus the notification type gives exactly one
`BUDGET_WARNING` and one `BUDGET_EXCEEDED` per line, for good.

Alerts go to every active member, not only the head who set the limit: the point is to change
behaviour, and the person who needs to know is usually whoever is about to spend next.

**Deliberately not covered:** CSV import does not raise per-row alerts. A thousand rows across
a year of categories would mean hundreds of background checks for warnings nobody reads one at
a time — the budget page shows the resulting position immediately instead.

#### 11. Only the amount is editable
`PATCH /budgets/:id` takes an amount and nothing else. Moving a budget to another category or
month is really "delete this one, create that one", and supporting it in place would mean
re-running the duplicate check for a case nobody actually asks for.

#### 12. Zero-budget division, and why `Infinity` never reaches the client
`percentUsedOf` returns `Infinity` when something is charged against a zero budget. That is the
mathematically honest answer, but **`Infinity` is not valid JSON** — `JSON.stringify` turns it
into `null`, which would silently break the progress bar. So the DTO clamps it to `100` while
`statusFor` still reads the raw value and returns `OVER`.

#### 13. Copy-forward, because re-entering budgets is why budgeting gets abandoned
`POST /budgets/copy` carries a month's limits into another, defaulting to *last month → this
month*. `overwrite` is **off** by default, so limits already adjusted in the target month are
left alone, and the response reports `copied / skipped / overwritten` rather than a bare
success — "8 copied · 3 left alone" is the whole outcome.

#### 14. The bar caps at 100%, the number does not
A line at 320% would otherwise blow the layout apart. The fill is
`Math.min(percentUsed, 100)` while the label prints the true figure and the overshoot in
money (`₹1,000 over`). Status is also written in words next to every bar, so red/amber/green
reinforces the meaning instead of carrying it alone.

#### 15. The form only offers what will succeed
Creating a second budget for a category is a 409. Rather than let the user find that out by
submitting, `BudgetFormDialog` is passed the ids already budgeted this month and filters them
out of the dropdown — and withholds the "Everything (family-wide cap)" option once one exists.
Client-side, cosmetic, and re-checked on the server as always.

---

### ▶️ How to Run

**No migration is needed** — `Budget` has been in the schema since Phase 0.

```bash
cd server && npm run dev
cd client && npm run dev
```

Then **Budget** in the sidebar. Sign in as the owner or a family head to set limits; a member
or viewer sees the same numbers read-only.

---

### ✅ How to Test

#### A. Manual walkthrough
1. Record a few expenses across two or three categories for the current month (Phase 4).
2. **Budget** → the four stat cards show zero budgeted and the real spend; every category you
   used appears under **Unbudgeted spending**.
3. **Set budget** → pick a category, give it a limit slightly *below* what you already spent.
   The line appears immediately as **Over budget**, red, with `₹X over`.
4. Set another comfortably above what you spent → **On track**, green.
5. Set one where the spend is between 75% and 100% → **Close to limit**, amber.
6. Set the **Everything (family-wide cap)** budget → the "Family-wide budget" card appears with
   its own bar, measured against *all* spending in the month.
7. Switch the month selector forward → everything empties (budgets are per month).
   **Copy** → copy from the previous month → the limits come across.
8. Add a new expense to a category that is near its limit → open the notifications table in
   Prisma Studio and see the `BUDGET_WARNING` / `BUDGET_EXCEEDED` row.
9. Now do it the other way round: set a limit *below* what a category has already spent, or
   edit an existing limit down past it. That alerts too, without waiting for a new expense.

#### B. Edge cases worth trying (to *see* the guards work)
- Budget a **parent** category, then file an expense under one of its **subcategories** → the
  parent's line moves. Budget the child too → both lines move, but the "Spent" stat card stays
  equal to real total spending, not the sum of the lines.
- Try to budget the same category twice in one month → 409
  `A budget for that category already exists in this month.` (The dropdown does not offer it.)
- Try to set a second family-wide cap → 409 `An overall budget already exists for this month.`
- Sign in as a **Member** → the numbers are all visible, but there is no *Set budget*, *Copy*
  or row actions. `POST /budgets` with curl → **403**.
- Delete a budget → the confirmation says the spending stays; afterwards that category moves
  into **Unbudgeted spending** with the same amount.
- Copy into a month that already has some budgets, with *Replace* off → the toast reports
  how many were left alone. Turn it on and copy again → they are replaced.
- Copy from a month with no budgets → 422 `That month has no budgets to copy.`
- Add several more expenses to an already-exceeded category → still exactly **one**
  `BUDGET_EXCEEDED` notification.

#### C. API testing with `curl`
```bash
TOKEN=<access token from /auth/login>

curl -s "http://localhost:5000/api/v1/budgets/vs-actual?month=7&year=2026" \
  -H "Authorization: Bearer $TOKEN"

curl -i -X POST http://localhost:5000/api/v1/budgets \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"amount":10000,"month":7,"year":2026,"categoryId":"<CATEGORY_ID>"}'

# The family-wide cap — no categoryId at all
curl -i -X POST http://localhost:5000/api/v1/budgets \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"amount":50000,"month":7,"year":2026}'

curl -i -X POST http://localhost:5000/api/v1/budgets/copy \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"fromMonth":6,"fromYear":2026,"toMonth":7,"toYear":2026,"overwrite":false}'
```

#### D. Static checks
```bash
cd server && npx tsc --noEmit
cd client && npx tsc --noEmit && npm run build
```

#### E. End-to-end
This phase was exercised against a real database and a running API: register → verify → set up
categories → record expenses → set budgets → read vs-actual → copy → export/import CSV → check
the notification rows — 55 assertions, all passing. Two things only that run could have found:

- budget writes did not trigger the over-budget check (concept 7);
- a freshly registered user has `activeFamilyId = null` until they switch workspaces, so code
  that needs their family must read the **membership**, not the user row.

#### F. Inspect the database
`npm run db:studio` → `budgets` (note `categoryId` NULL on the family-wide row, and that
`month`/`year` are plain integers, not a date), and `notifications` (`type`, and `metadata`
holding `budgetId`, `spent` and `budgeted` — that `budgetId` is what stops the second alert).

---

### 🧠 Self-check questions
1. Why do budgets need a permission of their own instead of reusing `FINANCE_WRITE`?
2. Why can't `totals.spent` be computed by adding up the category lines?
3. Why does the family-wide cap deliberately not stop a category appearing as "unbudgeted"?
4. Which half of `@@unique([familyId, categoryId, month, year])` does not work, and why?
5. Why was `periodRange` moved to UTC, and in which timezones would the old version be wrong?
6. Which two kinds of write can put a budget line over, and does the alert catch both?
7. What import cycle does `budget.alert.ts` exist to break, and why did two helpers have to
   move into `budget.types.ts`?
8. Why is `runBudgetCheck` not awaited?
9. What single value stops an overspent category from alerting on every subsequent expense?
10. Why does `Infinity` never reach the client, and what is sent instead?
11. Why does the budget form filter the category dropdown when the server already returns 409?

---

## Phase 6 — Dashboard

**Status:** ✅ Implemented (pending review)

### Overview

The first module that **owns no table at all**. Everything on this page already exists
somewhere else — income, expenses, budgets, and the four obligation tables — and the dashboard's
whole job is to ask the questions those modules cannot answer alone: *is this month better than
last?*, *is the plan holding?*, *what is owed next?*, *where did it go?*, *who spent it?*

It is also the first phase with real **data visualisation**, which brought its own set of rules
(a colour palette that survives colour-vision deficiency, a table twin for every chart).

### Endpoints (base `/api/v1/dashboard`)

| Method | Path | Guard | Purpose |
|---|---|---|---|
| GET | `/summary` | `FINANCE_VIEW` | The month at a glance + last-month comparison |
| GET | `/upcoming` | `FINANCE_VIEW` | EMI/bill/rent/school-fee obligations, one feed |
| GET | `/charts` | `FINANCE_VIEW` | 12-month cash flow + the month's category split |
| GET | `/top-expenses` | `FINANCE_VIEW` | Ranked categories + the largest single entries |
| GET | `/family-contribution` | `FINANCE_VIEW` | Who earned and who spent |

Every route is **read-only**, so the whole router sits on one `router.use(requirePermission('FINANCE_VIEW'))`
— a viewer exists precisely to look at this page. And there is **no `audit()` anywhere**: the
audit trail records changes, and logging reads would bury the real writes in noise.

### Backend files added (`server/src/modules/dashboard/`)
- **`dashboard.types.ts`** — DTOs, query types, `OBLIGATION_KINDS`, `CATEGORY_SPLIT_LIMIT`,
  `DEFAULT_UPCOMING_DAYS`.
- **`dashboard.validator.ts`** — Zod query schemas. Month/year default to *now* via **functions**,
  same as budgets.
- **`dashboard.repository.ts`** — Only what nothing else owns: the four obligation tables and the
  member roster. Income/expense/budget aggregation is reused, not re-written.
- **`dashboard.service.ts`** — The composite. Reads `incomeRepository`, `expenseRepository` and
  calls `budgetService.vsActual`.
- **`dashboard.controller.ts`** / **`dashboard.routes.ts`** — Thin handlers and wiring.

### Files touched
- **`routes/index.ts`** — mounts `dashboardRoutes` at `/dashboard`.
- **`client/src/constants/queryKeys.ts`** — the dashboard keys became **functions of the period**,
  and a `DASHBOARD` prefix was added for cross-module invalidation.
- **`client/src/features/{income,expenses,budget}/*.hooks.ts`** — every finance write now also
  invalidates `['dashboard']`.
- **`client/src/components/common/StatCard.tsx`** — `trend.upIsGood` (see concept 8).
- **`client/src/index.css`** — the two chart colour tokens, light and dark.

### Frontend files added
- **`types/dashboard.types.ts`**, **`services/dashboard.service.ts`** — typed API layer.
- **`components/charts/`** — `ChartCard` (chart ⇄ table toggle), `ChartTooltip`, `ChartLegend`,
  `chart.tokens.ts`. The project's first shared chart chrome.
- **`features/dashboard/`** — `dashboard.constants.ts`, `dashboard.hooks.ts`, `DashboardStats`,
  `CashFlowChart`, `SpendingByCategory`, `UpcomingPaymentsCard`, `BudgetSnapshotCard`,
  `TopExpensesCard`, `MemberContributions`.
- **`pages/dashboard/DashboardPage.tsx`** — the real screen.

---

### 🔑 Core Concepts Explained

#### 1. A read-only composite, and why it cannot create a cycle
Phase 5 had to work hard to avoid an import loop (`budget.alert.ts` exists for exactly that).
The dashboard reads *four* modules and needs none of that machinery, for one structural reason:

```
dashboard.service → income.repository / expense.repository / budget.service    ✅
(nothing)         → dashboard.service                                          ✅ never imported
```

**Nothing in the codebase imports the dashboard.** The dependency arrow only ever points *into*
this file, so composing freely here is safe. That is a property worth naming, because it stops
being true the moment something else wants a dashboard number.

It also reuses `budgetService.vsActual` rather than re-deriving the parent-absorbs-child roll-up.
Re-implementing that would mean two definitions of "spent against a budget" drifting apart.

#### 2. Comparison is the entire point of a summary
A number on its own — "₹71,400 spent" — is not information. `summary` therefore fetches the
**previous month too** and every headline carries `previousTotal` and `changePercent`. That is
four extra queries, all issued inside one `Promise.all`, which is why the endpoint is one round
trip rather than nine.

`changeFrom` returns `null` from a zero baseline, exactly as income's `changePercent` does
(Phase 3, concept 14) — and the UI hides the badge rather than printing `+∞%`.

#### 3. The budget snapshot: which "spent" belongs next to which "budgeted"
Reducing the whole plan to one bar is where double-counting sneaks back in (Phase 5, concept 3).
Three candidate pairs, two of them wrong:

| Budgeted | Spent | Verdict |
|---|---|---|
| sum of category lines | sum of category lines | ❌ double-counts a child budgeted under a budgeted parent |
| sum of category lines | *all* spending | ❌ charges the plan for categories it never covered |
| sum of category lines | all spending − unbudgeted | ✅ the plan measured against what the plan covers |

And when a **family-wide cap** exists it short-circuits all of that: the cap *is* the household's
plan, so it becomes the headline and is measured against total spending.

#### 4. "Upcoming" has to look backwards
An upcoming-payments card that hides a bill you already missed is worse than useless. The window
therefore opens **90 days behind today**, not on it — but it is bounded, because with no floor
the feed becomes an archive of every bill never marked paid, and next week's rent is buried
under it.

`OPEN_STATUSES` is the other half: `PENDING`, `OVERDUE` and **`PARTIAL`**. A half-paid bill still
owes the rest; `PAID` and `WAIVED` are settled.

#### 5. Projected instalments — showing a loan before the EMI module exists
Roadmap item 6.2 asks for upcoming payments "even if those modules aren't full yet". An `EMI` row
has a `dueDay`, a term and a `monthlyEMI`, but **nothing generates its schedule until Phase 7**.
So `projectEmiInstalments` derives the instalments the window touches, skipping any month that
already has an `EMIPayment` row, and flags them **`isProjected: true`** — the UI labels them
*Projected*. A reminder, not a debt recorded on the books.

`monthsInWindow` walks month buckets rather than days, so a 90-day window projects three
instalments and not ninety.

#### 6. `dueDay: 31` in a 30-day month
The same clamping trap as recurring income (Phase 3, concept 7), in a new place:

```ts
const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
return new Date(Date.UTC(year, month - 1, Math.min(dueDay, lastDayOfMonth)));
```

`Date.UTC(y, m, 0)` is the last day of month `m` (day zero = the day before the 1st of the next).
Without the `min`, a loan due on the 31st would silently roll into 1 November.

#### 7. "Today" must be read in UTC
Dates are stored at **UTC midnight** and `periodRange` builds its windows in UTC (Phase 5,
concept 6). `startOfTodayUtc()` completes that: reading "today" in local time would put a due date
stamped `2026-08-01T00:00Z` on the wrong side of the overdue line for anyone west of Greenwich.
Same bug, one layer up.

#### 8. Colour has to know whether up is good
`StatCard`'s trend was green when positive, red when negative. That is right for income and
**exactly backwards for expenses** — a 40% *fall* in spending is the best thing that happened all
month, and painting it red reads as a warning.

```ts
trend.value >= 0 === (trend.upIsGood ?? true) ? 'text-emerald-600' : 'text-red-600'
```

The sign and the arrow carry the *direction*; the colour only says whether that direction is
welcome.

#### 9. Why the chart palette is blue/orange and the cards stay emerald/rose
The stat cards use emerald for income and rose for expenses, and reusing that on a chart was the
obvious move. Measured, it fails: against this app's card surface the pair separates by only
**ΔE 5.6 under deuteranopia** — below even a 6–8 floor. On a card that does not matter much, because
each tile has a label, an icon and a heading. On a plot where two lines cross and colour is the
*only* thing telling them apart, it does.

Blue ↔ orange clears every gate in both modes (worst case **ΔE 24.7 light / 26.8 dark**), so the
charts get their own two tokens — declared as full hex, not HSL triplets, because they are read
straight into SVG `stroke`/`fill` rather than through Tailwind. The dark values are a *selected*
pair, not an automatic lightening of the light ones.

Chrome (grid, axis, ticks) deliberately reuses the app's existing `--border` / `--muted-foreground`
tokens, so the charts wear the same hairlines as every other surface.

#### 10. Every chart has a table twin
`ChartCard` takes `chart` **and** `table` — and `table` is not optional. A chart/table toggle sits
in the card header, so no value on this page is reachable only by hovering a mark or by telling
two colours apart. The table is the WCAG-clean equivalent, one click away, not a fallback for
failure.

Related: the category chart caps at `CATEGORY_SPLIT_LIMIT` slices and folds the rest into
**"Other (n)"**. A generated ninth hue is indistinguishable from an existing one under CVD, so
the chart caps its classes and *names* the remainder rather than growing the palette.

#### 11. One axis, two series
Income and expenses are amounts in the same currency, so they share one scale. The tempting move —
a second y-axis so both lines "use the full height" — invents a correlation the data does not
contain, because the reader has no way to know the two axes are scaled differently.

#### 12. Stale, not empty
Switching the month must not collapse the page into skeletons. Every dashboard query uses
`placeholderData: keepPreviousData`, and the cards **dim** (`isStale` → `opacity-60`) instead of
blanking. Note the distinction the page draws:

```tsx
isLoading={summary.isPending}   // never loaded — skeleton
isStale={charts.isFetching}     // reloading — dim what's there
```

Using `isFetching` for both would blank the tiles on every background refetch.

#### 13. The summary is the page's spine
If `/summary` fails the whole page is replaced by one error state. The alternative — six cards
each with its own error box — is six copies of the same failure. The other five queries degrade
individually, because a broken *contributions* card should not hide a working cash-flow chart.

#### 14. Query keys had to become functions
`DASHBOARD_SUMMARY: ['dashboard', 'summary']` was fine while nothing varied. With a month picker
it is a cache collision: July and August would share one entry and overwrite each other. The keys
are now `(period) => ['dashboard', 'summary', period]`, and a bare `DASHBOARD: ['dashboard']`
prefix was added — which every income, expense and budget write now invalidates, because the
dashboard reads all three.

#### 15. The member roster comes first, the groupings second
`groupBy` over transactions alone would omit a member who did nothing this month — and "Ravi
contributed nothing" is itself the finding, not an absence. So names come from the **active
roster** first, then any `memberId` still appearing in the groupings is added as a **"Former
member"** (Phase 3, concept 13, again). Dropping those would make the shares add up to less
than 100%.

---

### ▶️ How to Run

**No migration is needed** — this phase adds no table.

```bash
cd server && npm run dev
cd client && npm run dev
```

The dashboard is the app's landing page, so signing in is enough. The **Upcoming payments** card
stays empty until there is something in `emis` / `bills` / `rents` / `school_fees` — those modules
land in Phases 7 and 8. To see it working before then, insert a row by hand in Prisma Studio (an
`EMI` with `status = ACTIVE`, a `dueDay`, and a start/end date spanning today is enough to see a
**projected** instalment appear).

---

### ✅ How to Test

#### A. Manual walkthrough
1. Sign in → **Dashboard**. Four stat cards, a cash-flow chart, four cards below it and the
   contributions table.
2. With a month of income and expenses recorded, check the **trend** under each stat card, then
   switch the month picker back one month and confirm the comparison flips.
3. **Cash flow** → hover a month → the tooltip gives income, expenses and "Kept"/"Overspent".
   The selected month carries a *This month* reference line.
4. Toggle any chart to **Table** → the same numbers as rows, with the shown month in bold.
5. **Spending by category** → the top slices plus *Other (n)* if there are more.
6. Set a budget (Phase 5) → the **budget snapshot** bar appears. Set a family-wide cap → the bar
   switches to measuring against it.
7. Insert an active `EMI` in Prisma Studio → it appears under **Upcoming payments**, marked
   *Projected*.

#### B. Edge cases worth trying (to *see* the guards work)
- A month with **no income at all** → the savings-rate line is hidden, not `NaN`/`∞`, and the
  income trend badge disappears (zero baseline → `null`).
- A month where spending **fell** → the expense trend is **green**, not red (concept 8).
- Budget a parent *and* its child, then compare the snapshot's "spent" against the Budget page →
  the snapshot must not double-count.
- Give an EMI `dueDay = 31` and look at a 30-day month → the instalment lands on the 30th, never
  on the 1st of the next month.
- Back-date a bill's `dueDate` two weeks and leave it `PENDING` → it shows as **overdue** in the
  feed. Back-date another **six months** → it does *not* (the 90-day floor).
- Mark a bill `PARTIAL` → it stays in the feed. Mark it `PAID` → it leaves.
- Add an expense on the Expenses page, then return to the dashboard → the numbers have already
  moved (the `['dashboard']` invalidation).
- Sign in as a **Viewer** → the entire page renders; there is nothing here they may not see.
- Switch the month rapidly → cards dim, they never blank (`keepPreviousData`).
- Remove a member who has expenses this month → their row survives as **Former member** and the
  shares still total 100%.

#### C. API testing with `curl`
```bash
TOKEN=<access token from /auth/login>

curl -s "http://localhost:5000/api/v1/dashboard/summary?month=8&year=2026" -H "Authorization: Bearer $TOKEN"
curl -s "http://localhost:5000/api/v1/dashboard/charts?month=8&year=2026"  -H "Authorization: Bearer $TOKEN"
curl -s "http://localhost:5000/api/v1/dashboard/upcoming?days=30"          -H "Authorization: Bearer $TOKEN"
curl -s "http://localhost:5000/api/v1/dashboard/top-expenses?month=8&year=2026&limit=5" -H "Authorization: Bearer $TOKEN"
curl -s "http://localhost:5000/api/v1/dashboard/family-contribution?month=8&year=2026"  -H "Authorization: Bearer $TOKEN"

# No period at all — month/year default to now
curl -s http://localhost:5000/api/v1/dashboard/summary -H "Authorization: Bearer $TOKEN"
```

#### D. Static checks
```bash
cd server && npx tsc --noEmit
cd client && npx tsc --noEmit && npm run build
```

#### E. Inspect the database
Nothing new to look at — this phase writes nothing. That is the point. If a `GET` on this module
ever produces an `audit_logs` row, something has gone wrong.

---

### 🧠 Self-check questions
1. Why can the dashboard import four other modules when Phase 5 needed a whole file to avoid one cycle?
2. Which pair of numbers goes in the budget snapshot, and what is wrong with the other two candidates?
3. Why does an "upcoming" window open *behind* today — and why is that lookback bounded?
4. What is `isProjected`, and what makes it necessary before Phase 7 exists?
5. What does `Date.UTC(year, month, 0)` return, and which bug does it prevent?
6. Why is a 40% rise in spending red but a 40% rise in income green — from one line of code?
7. Why do the charts not reuse the stat cards' emerald/rose?
8. Why is `table` a required prop on `ChartCard` rather than an optional one?
9. What breaks if the two cash-flow series get their own y-axes?
10. Why is `isPending` used for one thing and `isFetching` for another?
11. What broke when the dashboard query keys were plain arrays?
12. Why is the member roster read separately when `groupBy` already returns member ids?

---

## Appendix A — Glossary of Concepts

| Term | Meaning in this project |
|---|---|
| **Tenant** | Top-level billing/isolation entity; owns families. |
| **Family** | The workspace (the practical tenant). Every row has `familyId`. |
| **DTO** | Data Transfer Object — the safe, public shape returned to clients (no secrets). |
| **JWT** | Signed, stateless token (`header.payload.signature`). |
| **Access token** | Short-lived (15m) Bearer token proving identity per request. |
| **Refresh token** | Long-lived (7d), revocable, single-use token that mints access tokens. |
| **Token rotation** | Issuing a new refresh token and revoking the old one on every refresh. |
| **bcrypt** | Deliberately slow, salted password hashing algorithm. |
| **httpOnly cookie** | Cookie unreadable by JS → XSS-safe transport for the refresh token. |
| **SameSite=Strict** | Cookie not sent cross-site → CSRF mitigation. |
| **Zod** | Runtime schema validation + static type inference. |
| **RBAC** | Role-Based Access Control (`SUPER_ADMIN`→`VIEWER` hierarchy). |
| **Clean Architecture** | Controller → Service → Repository layering with a strict dependency rule. |
| **Prisma `$transaction`** | Runs multiple queries atomically (all-or-nothing). |
| **User enumeration** | Leaking whether an email is registered; we intentionally prevent it. |
| **Rate limiting** | Capping request frequency to blunt brute-force/credential-stuffing. |
| **Tenant isolation** | Deriving `familyId` server-side so a request can only reach its own rows. |
| **IDOR** | Insecure Direct Object Reference — guessing another tenant's id; blocked by scoped lookups. |
| **Privilege escalation** | Granting yourself/others a role above your own; blocked by the *strictly below* rule. |
| **Soft delete** | Flagging a row inactive instead of deleting it, to preserve linked history. |
| **Open redirect** | A `?redirect=` that jumps to another origin; blocked by `safeRedirect()`. |
| **Active workspace** | `User.activeFamilyId` — which family a multi-family user is currently in. |
| **`Decimal`** | Exact base-10 number type used for all money; floats drift by cents when summed. |
| **`ActorContext`** | The acting member as a plain object, so services never touch `req`. |
| **Ledger manager** | `FAMILY_HEAD` or above — may edit any member's entries, not just their own. |
| **Derived occurrence** | The next due date of a recurring entry, computed on read rather than stored. |
| **Month clamping** | 31 Jan + 1 month → 28 Feb; why every occurrence is computed from `start`. |
| **RFC 4180** | The CSV format: commas separate, quotes wrap, `""` is a literal quote. |
| **CSV injection** | A cell starting `= + - @` executing as a formula in Excel; neutralised on export. |
| **Partial import** | Writing the valid CSV rows and reporting the rest, instead of refusing the file. |
| **Budget line** | One category's limit for one month, and what has been spent against it. |
| **Roll-up** | A parent category's budget absorbing everything filed under its children. |
| **Double counting** | Summing lines when a parent and its child are both budgeted; why totals are computed separately. |
| **Unbudgeted spending** | Money spent in categories with no limit set — what keeps a budget honest. |
| **NULL distinctness** | Postgres treating each NULL as unique, so a unique index cannot enforce one nullable row. |
| **Fire-and-forget** | Running a side effect without awaiting it, so its failure cannot fail the request. |
| **Read-only composite** | A module that owns no table and only assembles other modules' data — the dashboard. |
| **Projected instalment** | An EMI due date derived on read because no schedule row exists yet; flagged, never billed. |
| **Table twin** | The accessible equivalent of a chart, always one toggle away in the same card. |
| **ΔE** | Perceptual colour distance; used to prove two series stay distinct under colour-vision deficiency. |
| **Stale, not empty** | Dimming previous data while a refetch runs instead of collapsing to a skeleton. |

---

*End of current notes. Append the next `## Phase 7 — EMI Management` section here when
that phase is implemented.*

## Phase 9 — Goals & Savings

Implemented family-scoped goals with target and saved balances, optional deadlines, contribution
history, and derived progress. Contributions are written alongside the aggregate saved amount in one
database transaction; a goal is automatically completed when its target is reached. The UI supports
creating goals, recording contributions, progress bars, and role-gated deletion.

## Phase 10 — Chit Fund

Planned next: household chit funds, monthly instalment schedule and payment tracking. Each payment
must remain tenant-scoped through its parent fund and be recorded independently from the fund terms.
