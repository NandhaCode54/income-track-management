# Family Finance Manager

Family Finance Manager is a multi-tenant web application for managing household and shared finances. Each family works in an isolated workspace where members can record income and expenses, plan budgets, manage payments and loans, track assets, and review financial reports.

The project includes a customer-facing application, a separate administrator interface, and a REST API.

## Features

- Family workspaces with invitations and role-based access control.
- Income, expense, category, receipt, CSV-import, and recurring-transaction management.
- Budgets, savings goals, dashboard summaries, reports, and financial insights.
- EMI schedules and payment tracking, bills, rent, school fees, and chit funds.
- Investments, physical assets, liabilities, and net-worth tracking.
- In-app notifications and scheduled reminders for payments, EMIs, recurring items, and budget alerts.
- Subscription plans, payment-intent handling, and signed payment-provider webhooks.
- Super-admin tools for users, families, subscriptions, audit logs, and announcements.

## Technology stack

| Area | Technologies |
| --- | --- |
| Client | React 18, TypeScript, Vite, Tailwind CSS, React Query, Zustand, Recharts |
| API | Node.js, Express, TypeScript, Zod |
| Data | PostgreSQL, Prisma ORM, Redis |
| Supporting services | Cloudinary for uploads, SMTP for email, Node Cron for reminders |
| Security | JWT authentication, HTTP-only cookies, RBAC, tenant isolation, Helmet, CORS, rate limiting, audit logs |
| Deployment | Docker, Docker Compose, Nginx |

## Architecture

```text
React applications (client and admin)
             |
          REST API
             |
Express middleware: authentication, validation, RBAC, tenant scope, audit logs
             |
Service and repository layers
             |
PostgreSQL via Prisma | Redis | Cloudinary | SMTP
```

All family financial records are scoped to a family workspace. Access is controlled through the roles `SUPER_ADMIN`, `TENANT_OWNER`, `FAMILY_HEAD`, `MEMBER`, and `VIEWER`.

## Prerequisites

- Node.js 20 or later
- npm 10 or later
- PostgreSQL 16 (or Docker)
- Redis 7 (or Docker)
- Docker Desktop and Docker Compose, if using the containerized setup

## Quick start with Docker

1. Create the server environment file from the example.

   ```powershell
   Copy-Item server/.env.example server/.env
   ```

2. Edit `server/.env` and replace all placeholder secrets and service credentials. At minimum, use strong JWT secrets; the server validates required SMTP and Cloudinary values at startup.

3. Start the stack.

   ```powershell
   docker compose up --build
   ```

4. Open the application at [http://localhost](http://localhost). The API health endpoint is available at [http://localhost:5000/health](http://localhost:5000/health), and MailHog is available at [http://localhost:8025](http://localhost:8025).

The server container applies Prisma migrations before it starts. Stop the services with `docker compose down`; add `-v` only when you intentionally want to remove the local PostgreSQL and Redis volumes.

## Local development

### 1. Install dependencies

```powershell
Set-Location server; npm ci
Set-Location ../client; npm ci
Set-Location ..
```

### 2. Configure services and environment

Start PostgreSQL, Redis, and MailHog with Docker:

```powershell
docker compose up -d postgres redis mailhog
```

Create `server/.env` from `server/.env.example`. For MailHog, set `SMTP_HOST=localhost`, `SMTP_PORT=1025`, `SMTP_SECURE=false`, and provide non-empty values for `SMTP_USER` and `SMTP_PASS` because they are required by environment validation. Configure Cloudinary credentials for receipt and avatar uploads.

The client does not require an environment file during local development: Vite proxies `/api` to `http://localhost:5000`. For a separately hosted API, configure the reverse proxy to forward `/api` to the API service.

### 3. Create the database schema

```powershell
Set-Location server
npm run db:generate
npm run db:migrate
```

Optional: create a development administrator and demo family.

```powershell
$env:SEED_ADMIN_EMAIL = "admin@familyfinance.app"
$env:SEED_ADMIN_PASSWORD = "choose-a-strong-development-password"
npm run db:seed
```

The seed command refuses to run in production unless explicitly permitted.

### 4. Run the applications

In separate terminals:

```powershell
# Terminal 1
Set-Location server
npm run dev

# Terminal 2 — customer application
Set-Location client
npm run dev

# Terminal 3 — administrator application (optional)
Set-Location client
npm run dev:admin
```

The customer application runs on `http://localhost:5173`, the administrator application on `http://localhost:5174`, and the API on `http://localhost:5000`.

## Environment configuration

`server/.env.example` is the complete template. Do not commit `server/.env` or real credentials.

| Variable group | Purpose |
| --- | --- |
| `DATABASE_URL`, `POSTGRES_*` | PostgreSQL connection and Docker database configuration |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Token signing secrets; use unique values of at least 32 characters |
| `SMTP_*`, `EMAIL_FROM` | Email delivery for verification, password reset, and invitations |
| `REDIS_*` | Redis connection for caching and sessions |
| `CLOUDINARY_*` | Receipt and image upload storage |
| `ENABLE_CRON`, `CRON_TIMEZONE` | Scheduled reminders and recurring-record generation |
| `PAYMENT_DEMO_MODE`, `PAYMENT_WEBHOOK_SECRET` | Development payment simulation and provider webhook verification |

`PAYMENT_DEMO_MODE` must remain `false` in production. Scheduled jobs run in-process, so when deploying multiple API instances, enable `ENABLE_CRON=true` on exactly one worker.

## Available scripts

### Server (`server/`)

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API in watch mode |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled API |
| `npm test` | Run the Vitest test suite |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` | Create and apply development migrations |
| `npm run db:migrate:prod` | Apply committed migrations for production |
| `npm run db:seed` | Seed a demo administrator and family |
| `npm run db:studio` | Open Prisma Studio |

### Client (`client/`)

| Command | Description |
| --- | --- |
| `npm run dev` | Start the customer app |
| `npm run dev:admin` | Start the administrator app |
| `npm run build` | Type-check and build the customer app |
| `npm run build:admin` | Type-check and build the administrator app |
| `npm run typecheck` | Run TypeScript checks without building |
| `npm run preview` | Preview a production client build |

## API

The API is mounted at `/api/v1`; `GET /health` is available without authentication. Major resource groups include:

```text
/auth             /families          /income            /expenses
/budgets          /dashboard         /emi               /bills
/rent             /school-fees       /goals             /chit-funds
/investments      /assets            /liabilities       /portfolio
/notifications    /reports           /insights          /subscriptions
/settings         /admin
```

Protected endpoints require an authenticated user and enforce both family scope and role permissions. The payment webhook is exposed at `/api/v1/subscriptions/webhook` and verifies a provider signature before activating a subscription.

## Project structure

```text
.
├── client/          # React customer and admin interfaces
├── server/          # Express API, Prisma schema, migrations, jobs, and tests
├── showcase/        # Static project showcase
├── docker-compose.yml
├── PROJECT_PLAN.md  # Product and architecture plan
└── PHASE_NOTES.md   # Implementation notes
```

## Verification

Run these checks before opening a pull request:

```powershell
Set-Location server
npm test
npm run build

Set-Location ../client
npm run typecheck
npm run build
npm run build:admin
```

GitHub Actions runs server type-checking and migration deployment against PostgreSQL, plus client type-checking and production builds, for pushes and pull requests to `main`.

## Security and operational notes

- Use HTTPS and production-grade secrets in deployed environments.
- Keep `PAYMENT_WEBHOOK_SECRET` private and validate provider webhooks before activating paid plans.
- Back up PostgreSQL regularly; Docker volumes hold local database and Redis data.
- Configure a production SMTP provider and Cloudinary account before enabling those capabilities for real users.
- Do not run the development seed command against a production database.

## License

No license has been specified for this repository. Add a license file before distributing or open-sourcing the project.
