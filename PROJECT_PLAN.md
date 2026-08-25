# Family Finance Manager — Project Master Plan

> **Type:** Multi-Tenant SaaS  
> **Version:** 1.0.0  
> **Status:** In Development — Phase 17 complete  
> **Last Updated:** 2026-08-25  
> **Architect:** Senior Full Stack / Principal Engineer

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Design](#2-architecture-design)
3. [Database Design](#3-database-design)
4. [API Design](#4-api-design)
5. [Folder Structure](#5-folder-structure)
6. [Module Breakdown & Time Estimate](#6-module-breakdown--time-estimate)
7. [Implementation Roadmap](#7-implementation-roadmap)
8. [Security Plan](#8-security-plan)
9. [Deployment Plan](#9-deployment-plan)
10. [Done Checklist](#10-done-checklist)

---

## 1. Project Overview

**Family Finance Manager** is a production-grade multi-tenant SaaS application that enables families, small businesses, shared homes, and joint families to collaboratively track income, expenses, budgets, EMIs, bills, investments, and savings goals — all within an isolated family workspace.

### Target Users
| User Type | Description |
|-----------|-------------|
| Middle-class families | Monthly expense + EMI + savings tracking |
| Small businesses | Business income + expense management |
| Shared homes / Hostels | Shared cost splitting and tracking |
| Students | Budget management |
| Joint families | Multi-member finance with role-based access |

### Core Value Proposition
- **Isolation:** Every family gets its own tenant workspace
- **Collaboration:** Multiple members with different permission levels
- **Insight:** AI-powered spending analysis and recommendations
- **Automation:** Recurring transactions, reminders, cron jobs

---

## 2. Architecture Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                            │
│  React + Vite + TypeScript + TailwindCSS + Shadcn UI + Recharts │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS / REST
┌───────────────────────────▼─────────────────────────────────────┐
│                          API GATEWAY LAYER                       │
│        Express + TypeScript + Helmet + Rate Limiting + CORS      │
├─────────────────────────────────────────────────────────────────┤
│                       MIDDLEWARE LAYER                           │
│  Auth (JWT) │ RBAC │ Tenant Isolation │ Validation │ Audit Log  │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┤
│  Auth    │ Finance  │  Family  │ Reports  │  Admin   │  Notif.  │
│ Module   │ Module   │ Module   │ Module   │  Panel   │  Module  │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                         DATA LAYER                               │
│          Prisma ORM → PostgreSQL (multi-tenant schema)           │
│          Cloudinary (file storage)  │  Redis (cache/sessions)    │
└─────────────────────────────────────────────────────────────────┘
```

### Architecture Principles
- **Clean Architecture:** Controller → Service → Repository → Database
- **Multi-Tenancy:** Row-level tenant isolation via `familyId` on every table
- **RBAC:** Permission checks at middleware level, not scattered in business logic
- **Audit Trail:** Every write operation logged automatically via middleware
- **Event-Driven Notifications:** Node Cron + Notification queue for reminders

### Role Hierarchy
```
Super Admin
  └── Tenant Owner (Family Creator)
        └── Family Head (full family permissions)
              └── Member (add/edit own transactions)
                    └── Viewer (read-only)
```

---

## 3. Database Design

### Entity Relationship Overview

```
Tenant (1) ──── (∞) Family
Family (1) ──── (∞) FamilyMember
FamilyMember (∞) ──── (1) User
User (1) ──── (∞) RefreshToken
User (1) ──── (∞) Session

Family (1) ──── (∞) Income
Family (1) ──── (∞) Expense
Family (1) ──── (∞) ExpenseCategory
Family (1) ──── (∞) Budget
Family (1) ──── (∞) Goal
Family (1) ──── (∞) EMI
Family (1) ──── (∞) SchoolFee
Family (1) ──── (∞) Rent
Family (1) ──── (∞) Bill
Family (1) ──── (∞) ChitFund
Family (1) ──── (∞) Investment
Family (1) ──── (∞) Asset
Family (1) ──── (∞) Liability
Family (1) ──── (∞) Notification
Family (1) ──── (∞) Document
Family (1) ──── (∞) AuditLog
Family (1) ──── (1) Subscription
Family (1) ──── (1) FamilySettings
```

### Prisma Schema Tables

| Table | Key Fields | Purpose |
|-------|-----------|---------|
| `User` | id, email, passwordHash, isVerified, isActive | Auth identity |
| `Tenant` | id, name, plan, isActive | Subscription tenant |
| `Family` | id, tenantId, name, code | Workspace |
| `FamilyMember` | id, familyId, userId, role | Member + role link |
| `Role` | id, name, permissions[] | RBAC |
| `Permission` | id, action, resource | Granular permissions |
| `RefreshToken` | id, userId, token, expiresAt | JWT rotation |
| `Session` | id, userId, device, ip | Session tracking |
| `Income` | id, familyId, memberId, amount, type, date, isRecurring | Income entries |
| `Expense` | id, familyId, memberId, categoryId, amount, date, receipt | Expense entries |
| `ExpenseCategory` | id, familyId, name, icon, color, parentId | Category tree |
| `Budget` | id, familyId, categoryId, amount, month, year | Monthly budgets |
| `Goal` | id, familyId, name, targetAmount, savedAmount, deadline | Savings goals |
| `EMI` | id, familyId, name, loanAmount, rate, tenure, startDate | Loan/EMI |
| `EMIPayment` | id, emiId, amount, paidDate, status | EMI payment history |
| `SchoolFee` | id, familyId, studentName, school, amount, dueDate | School fees |
| `Rent` | id, familyId, propertyName, amount, dueDate, paidDate | Rent tracking |
| `Bill` | id, familyId, type, amount, dueDate, paidDate, isRecurring | Utility bills |
| `ChitFund` | id, familyId, organizer, totalAmount, monthlyAmount | Chit fund |
| `ChitPayment` | id, chitFundId, month, amount, paidDate | Chit payments |
| `Investment` | id, familyId, type, name, amount, currentValue, date | Investments |
| `Asset` | id, familyId, name, type, value, purchaseDate | Assets |
| `Liability` | id, familyId, name, type, amount, dueDate | Liabilities |
| `Notification` | id, familyId, userId, type, message, isRead | Notifications |
| `Reminder` | id, familyId, entityType, entityId, remindAt | Scheduled reminders |
| `Receipt` | id, familyId, expenseId, url, cloudinaryId | Receipt images |
| `Document` | id, familyId, name, type, url, cloudinaryId | Document storage |
| `Subscription` | id, familyId, plan, status, renewalDate | Plan subscription |
| `AuditLog` | id, familyId, userId, action, entity, entityId, diff | Audit trail |
| `FamilySettings` | id, familyId, currency, timezone, language | Family config |
| `Invite` | id, familyId, email, role, token, expiresAt | Member invites |

---

## 4. API Design

### Base URL: `/api/v1`

#### Authentication Endpoints
```
POST   /auth/register              Register new user + create family
POST   /auth/login                 Login → returns access + refresh token
POST   /auth/logout                Invalidate refresh token
POST   /auth/refresh               Get new access token
POST   /auth/verify-email          Verify email with OTP/link
POST   /auth/resend-verification   Resend email verification
POST   /auth/forgot-password       Send password reset email
POST   /auth/reset-password        Reset password with token
GET    /auth/me                    Get current user profile
PATCH  /auth/me                    Update profile
PATCH  /auth/change-password       Change password
```

#### Family & Member Endpoints
```
GET    /families                     List workspaces I belong to
POST   /families/switch              Switch active workspace
GET    /families/me                  Get my family
PATCH  /families/me                  Update family info
GET    /families/members             List all members
PATCH  /families/members/:id/role    Change member role
DELETE /families/members/:id         Remove member (soft)
POST   /families/invite              Invite member by email
GET    /families/invites             List pending invites
POST   /families/invites/:id/resend  Re-send an invitation
DELETE /families/invites/:id         Revoke an invitation
GET    /families/invites/token/:t    Public invite preview (pre sign-in)
POST   /families/join/:token         Accept invite
```

#### Income Endpoints
```
GET    /income                     List income (filters: date, type, member)
POST   /income                     Add income entry
GET    /income/:id                 Get single income
PATCH  /income/:id                 Update income
DELETE /income/:id                 Delete income
GET    /income/summary             Monthly/yearly summary
GET    /income/recurring           List recurring incomes
```

#### Expense Endpoints
```
GET    /expenses                       List expenses (filter: category, member, method,
                                       tag, date range, amount range, search, recurring)
POST   /expenses                       Add expense
GET    /expenses/:id                   Get single expense
PATCH  /expenses/:id                   Update expense
DELETE /expenses/:id                   Delete expense
GET    /expenses/summary               Summary stats + breakdowns
GET    /expenses/recurring             Recurring expenses + next due date
POST   /expenses/:id/receipt           Upload receipt (multipart)
DELETE /expenses/:id/receipts/:rid     Delete a receipt
GET    /expenses/categories            List categories (tree)
POST   /expenses/categories            Create category
PATCH  /expenses/categories/:id        Update category
DELETE /expenses/categories/:id        Delete category
POST   /expenses/import                Import CSV (multipart)
GET    /expenses/export                Export CSV (honours the list filters)
```

#### Budget Endpoints
```
GET    /budgets                    List budgets (month/year)
GET    /budgets/vs-actual          Budget vs actual, incl. unbudgeted spending
POST   /budgets                    Create budget (category, or family-wide cap)
POST   /budgets/copy               Copy a month's budgets into another month
PATCH  /budgets/:id                Update the amount
DELETE /budgets/:id                Delete budget
```

> Reads need `FINANCE_VIEW`; writes need `BUDGET_MANAGE` (owner + family head) —
> recording spending and deciding the limits are different acts.

#### Goals Endpoints
```
GET    /goals                      List all goals
POST   /goals                      Create goal
GET    /goals/:id                  Get goal details
PATCH  /goals/:id                  Update goal
DELETE /goals/:id                  Delete goal
POST   /goals/:id/contribute       Add contribution
```

#### EMI Endpoints
```
GET    /emi                        List all EMIs
POST   /emi                        Add EMI
GET    /emi/:id                    Get EMI details
PATCH  /emi/:id                    Update EMI
DELETE /emi/:id                    Delete EMI
POST   /emi/:id/payment            Mark payment made
GET    /emi/:id/payments           Payment history
GET    /emi/calculator             EMI calculator (query params)
GET    /emi/upcoming               Upcoming EMIs (30 days)
```

#### Bills / Rent / School Fee Endpoints
```
GET    /bills                      List bills
POST   /bills                      Add bill
PATCH  /bills/:id                  Update
DELETE /bills/:id                  Delete
POST   /bills/:id/pay              Mark as paid

GET    /rent                       List rent entries
POST   /rent                       Add rent
PATCH  /rent/:id                   Update
POST   /rent/:id/pay               Mark paid

GET    /school-fees                List school fees
POST   /school-fees                Add fee
PATCH  /school-fees/:id            Update
POST   /school-fees/:id/pay        Mark paid
```

#### Investment / Asset / Liability Endpoints
```
GET    /investments                List investments
POST   /investments                Add investment
PATCH  /investments/:id            Update (current value)
DELETE /investments/:id            Delete
GET    /investments/summary        Portfolio summary

GET    /assets                     List assets
POST   /assets                     Add asset
PATCH  /assets/:id                 Update
DELETE /assets/:id                 Delete
GET    /assets/net-worth           Net worth calculation

GET    /liabilities                List liabilities
POST   /liabilities                Add liability
PATCH  /liabilities/:id            Update
DELETE /liabilities/:id            Delete
```

#### Reports Endpoints
```
GET    /reports/monthly            Monthly P&L report
GET    /reports/yearly             Yearly summary
GET    /reports/category-wise      Spending by category
GET    /reports/member-wise        Spending by member
GET    /reports/cash-flow          Cash flow chart data
GET    /reports/export/pdf         Export PDF report
GET    /reports/export/excel       Export Excel
```

#### Dashboard Endpoints
```
GET    /dashboard/summary          Current month overview
GET    /dashboard/upcoming         Upcoming payments (EMI/Bills/Rent)
GET    /dashboard/charts           Chart data
GET    /dashboard/top-expenses     Top 5 expense categories
GET    /dashboard/family-contribution  Who spent what
```

#### Notifications Endpoints
```
GET    /notifications              List notifications
PATCH  /notifications/:id/read     Mark as read
POST   /notifications/read-all     Mark all read
DELETE /notifications/:id          Delete notification
GET    /notifications/unread-count Unread count
```

#### Admin Endpoints (Super Admin only)
```
GET    /admin/users                List all users
PATCH  /admin/users/:id/status     Activate/deactivate
GET    /admin/families             List all families
GET    /admin/subscriptions        Subscription overview
GET    /admin/analytics            Platform analytics
GET    /admin/audit-logs           Global audit logs
POST   /admin/announcements        Send announcement
GET    /admin/revenue              Revenue stats
```

#### Settings Endpoints
```
GET    /settings                   Get family settings
PATCH  /settings                   Update settings
GET    /settings/subscription      Current subscription
POST   /settings/subscription/upgrade  Upgrade plan
```

---

## 5. Folder Structure

### Backend (`/server`)
```
server/
├── src/
│   ├── config/
│   │   ├── app.ts               Express app setup
│   │   ├── database.ts          Prisma client
│   │   ├── env.ts               Environment variable validation
│   │   ├── cors.ts              CORS config
│   │   └── redis.ts             Redis client (optional)
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.repository.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.validator.ts
│   │   │   └── auth.types.ts
│   │   ├── family/
│   │   ├── income/
│   │   ├── expense/
│   │   ├── budget/
│   │   ├── goal/
│   │   ├── emi/
│   │   ├── bill/
│   │   ├── rent/
│   │   ├── school-fee/
│   │   ├── chit-fund/
│   │   ├── investment/
│   │   ├── asset/
│   │   ├── liability/
│   │   ├── notification/
│   │   ├── report/
│   │   ├── dashboard/
│   │   ├── document/
│   │   ├── admin/
│   │   └── settings/
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.ts    JWT verification
│   │   ├── rbac.middleware.ts    Role-based access control
│   │   ├── tenant.middleware.ts  Tenant isolation enforcer
│   │   ├── audit.middleware.ts   Audit log writer
│   │   ├── validate.middleware.ts Zod request validation
│   │   ├── rateLimit.middleware.ts
│   │   └── error.middleware.ts  Global error handler
│   │
│   ├── shared/
│   │   ├── types/
│   │   │   ├── express.d.ts     Augmented Request type
│   │   │   ├── pagination.ts
│   │   │   └── api-response.ts
│   │   ├── utils/
│   │   │   ├── jwt.util.ts
│   │   │   ├── bcrypt.util.ts
│   │   │   ├── email.util.ts    Nodemailer wrapper
│   │   │   ├── cloudinary.util.ts
│   │   │   ├── pagination.util.ts
│   │   │   ├── date.util.ts
│   │   │   ├── emi-calculator.util.ts
│   │   │   └── api-response.util.ts
│   │   ├── errors/
│   │   │   ├── AppError.ts      Base error class
│   │   │   ├── ValidationError.ts
│   │   │   ├── AuthError.ts
│   │   │   └── NotFoundError.ts
│   │   └── constants/
│   │       ├── roles.ts
│   │       ├── permissions.ts
│   │       └── messages.ts
│   │
│   ├── jobs/                    Node Cron jobs
│   │   ├── emi-reminder.job.ts
│   │   ├── bill-reminder.job.ts
│   │   ├── rent-reminder.job.ts
│   │   └── scheduler.ts         Job registry
│   │
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   │
│   └── server.ts                Entry point
│
├── .env.example
├── package.json
├── tsconfig.json
└── docker-compose.yml
```

### Frontend (`/client`)
```
client/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── Router.tsx           React Router config
│   │   └── providers/
│   │       ├── QueryProvider.tsx TanStack Query setup
│   │       ├── AuthProvider.tsx
│   │       └── ThemeProvider.tsx
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   ├── ResetPasswordPage.tsx
│   │   │   └── VerifyEmailPage.tsx
│   │   ├── dashboard/
│   │   ├── income/
│   │   ├── expenses/
│   │   ├── budget/
│   │   ├── goals/
│   │   ├── emi/
│   │   ├── bills/
│   │   ├── rent/
│   │   ├── school-fees/
│   │   ├── chit-fund/
│   │   ├── investments/
│   │   ├── assets/
│   │   ├── reports/
│   │   ├── notifications/
│   │   ├── family/
│   │   ├── settings/
│   │   └── admin/
│   │
│   ├── components/
│   │   ├── ui/                  Shadcn components (auto-generated)
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Topbar.tsx
│   │   │   ├── AppLayout.tsx
│   │   │   └── AuthLayout.tsx
│   │   ├── common/
│   │   │   ├── DataTable.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   ├── StatCard.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── LoadingSkeleton.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   ├── DateRangePicker.tsx
│   │   │   ├── CurrencyInput.tsx
│   │   │   └── SearchInput.tsx
│   │   ├── charts/
│   │   │   ├── PieChart.tsx
│   │   │   ├── LineChart.tsx
│   │   │   ├── BarChart.tsx
│   │   │   └── AreaChart.tsx
│   │   └── forms/               Reusable form field components
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useFamily.ts
│   │   ├── usePagination.ts
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   ├── usePermission.ts
│   │   └── useNotifications.ts
│   │
│   ├── services/                TanStack Query hooks + API calls
│   │   ├── api.ts               Axios instance
│   │   ├── auth.service.ts
│   │   ├── income.service.ts
│   │   ├── expense.service.ts
│   │   └── ... (one per module)
│   │
│   ├── store/                   Zustand global state
│   │   ├── auth.store.ts
│   │   └── ui.store.ts
│   │
│   ├── types/
│   │   ├── auth.types.ts
│   │   ├── income.types.ts
│   │   ├── expense.types.ts
│   │   └── ... (one per module)
│   │
│   ├── utils/
│   │   ├── formatCurrency.ts
│   │   ├── formatDate.ts
│   │   ├── emiCalculator.ts
│   │   └── validators.ts
│   │
│   └── constants/
│       ├── routes.ts
│       ├── queryKeys.ts
│       └── permissions.ts
│
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 6. Module Breakdown & Time Estimate

> **Assumptions:**  
> - Solo developer (adjust if team)  
> - 6–8 productive hours per day  
> - Each "module" = Backend API + Frontend UI + Integration  
> - Does NOT include testing phase time (add 20% buffer)

| # | Module | Backend | Frontend | Total | Cumulative |
|---|--------|---------|----------|-------|------------|
| 1 | **Phase 0: Foundation** | 3 days | 2 days | **5 days** | Week 1 |
| 2 | **Authentication** | 3 days | 3 days | **6 days** | Week 2–3 |
| 3 | **Family & Members** | 2 days | 2 days | **4 days** | Week 3 |
| 4 | **RBAC & Permissions** | 2 days | 1 day | **3 days** | Week 4 |
| 5 | **Income Module** | 2 days | 2 days | **4 days** | Week 4–5 |
| 6 | **Expense Module** | 3 days | 3 days | **6 days** | Week 5–6 |
| 7 | **Expense Categories** | 1 day | 1 day | **2 days** | Week 6 |
| 8 | **Budget Planning** | 2 days | 2 days | **4 days** | Week 7 |
| 9 | **Dashboard** | 3 days | 3 days | **6 days** | Week 8 |
| 10 | **EMI Management** | 2 days | 3 days | **5 days** | Week 8–9 |
| 11 | **Bills Management** | 2 days | 2 days | **4 days** | Week 9–10 |
| 12 | **Rent Management** | 1 day | 1 day | **2 days** | Week 10 |
| 13 | **School Fees** | 1 day | 1 day | **2 days** | Week 10 |
| 14 | **Goals & Savings** | 2 days | 2 days | **4 days** | Week 11 |
| 15 | **Chit Fund** | 2 days | 2 days | **4 days** | Week 11–12 |
| 16 | **Investments** | 2 days | 2 days | **4 days** | Week 12 |
| 17 | **Assets & Liabilities** | 2 days | 2 days | **4 days** | Week 13 |
| 18 | **Notifications + Reminders** | 2 days | 1 day | **3 days** | Week 13 |
| 19 | **Reports + Export** | 3 days | 3 days | **6 days** | Week 14–15 |
| 20 | **Receipt / Document Upload** | 1 day | 2 days | **3 days** | Week 15 |
| 21 | **AI Insights** | 3 days | 2 days | **5 days** | Week 16 |
| 22 | **Admin Panel** | 3 days | 3 days | **6 days** | Week 17 |
| 23 | **Subscription System** | 2 days | 2 days | **4 days** | Week 17–18 |
| 24 | **Polish: Dark Mode + Mobile** | — | 3 days | **3 days** | Week 18 |
| 25 | **Testing + Bug Fixes** | 3 days | 2 days | **5 days** | Week 19 |
| 26 | **Deployment + CI/CD** | 3 days | 1 day | **4 days** | Week 20 |

### Total Estimate

| Scenario | Duration |
|----------|----------|
| **Solo developer** (6–8h/day) | **~20 weeks (5 months)** |
| **2-person team** (frontend + backend split) | **~12 weeks (3 months)** |
| **3-person team** | **~8–9 weeks (2 months)** |

---

## 7. Implementation Roadmap

Modules will be built in this exact order. Each module must be **reviewed and approved** before the next begins.

### Phase 0 — Foundation ✅ NEXT
- [ ] 0.1 Initialize monorepo (`/server` + `/client`)
- [ ] 0.2 Backend: Express + TypeScript + Prisma setup
- [ ] 0.3 Prisma schema (full database)
- [ ] 0.4 Docker Compose (PostgreSQL + Redis)
- [ ] 0.5 Environment config + validation (`zod`)
- [ ] 0.6 Global error handler + AppError classes
- [ ] 0.7 API response wrapper utility
- [ ] 0.8 Frontend: Vite + React + TypeScript + TailwindCSS + Shadcn UI
- [ ] 0.9 Frontend: Router setup + layouts
- [ ] 0.10 Axios instance + interceptors

### Phase 1 — Authentication ✅ (implemented — pending review)
- [x] 1.1 Register (email + password, auto-create family + tenant)
- [x] 1.2 Email verification (OTP / token link)
- [x] 1.3 Login → JWT access token + refresh token
- [x] 1.4 Refresh token rotation
- [x] 1.5 Forgot password → email link
- [x] 1.6 Reset password
- [x] 1.7 Logout (invalidate refresh token)
- [x] 1.8 Auth middleware (JWT verification)
- [x] 1.9 Frontend: All auth pages + forms

### Phase 2 — Family & Members & RBAC
- [x] 2.1 Family workspace management
- [x] 2.2 Invite member by email (token-based)
- [x] 2.3 Accept invite
- [x] 2.4 Role assignment (Family Head, Member, Viewer)
- [x] 2.5 Permission middleware
- [x] 2.6 Tenant isolation middleware
- [x] 2.7 Frontend: Family management UI

### Phase 3 — Income Module
- [x] 3.1 Income CRUD API
- [x] 3.2 Recurring income support
- [x] 3.3 Income summary/aggregation
- [x] 3.4 Frontend: Income list + add/edit form

### Phase 4 — Expense Module
- [x] 4.1 Expense Category CRUD (hierarchical, two levels)
- [x] 4.2 Expense CRUD API
- [x] 4.3 Receipt upload (Cloudinary)
- [x] 4.4 CSV import/export
- [x] 4.5 Expense filters + search + pagination
- [x] 4.6 Frontend: Expense UI complete

### Phase 5 — Budget Planning
- [x] 5.1 Monthly budget per category (plus an optional family-wide cap)
- [x] 5.2 Budget vs actual tracking
- [x] 5.3 Over-budget notification trigger
- [x] 5.4 Frontend: Budget planner UI

### Phase 6 — Dashboard
- [x] 6.1 Monthly summary aggregations
- [x] 6.2 Upcoming payments (EMI/Bills/Rent — even if those modules aren't full yet)
- [x] 6.3 Chart data APIs
- [x] 6.4 Frontend: Dashboard with Recharts

### Phase 7 — EMI Management
- [x] 7.1 EMI CRUD + calculator
- [x] 7.2 Payment tracking
- [x] 7.3 Reminder cron job
- [x] 7.4 Frontend: EMI manager + calculator UI

### Phase 8 — Bills / Rent / School Fees
- [x] 8.1 Bills CRUD + recurring
- [x] 8.2 Rent CRUD + payment history
- [x] 8.3 School fees CRUD
- [x] 8.4 Frontend: All three UIs

### Phase 9 — Goals & Savings
- [x] 9.1 Goals CRUD + contribution tracking
- [x] 9.2 Progress calculation
- [x] 9.3 Frontend: Goals UI with progress bars

### Phase 10 — Chit Fund
- [x] 10.1 Chit fund CRUD
- [x] 10.2 Monthly payment tracking
- [x] 10.3 Frontend: Chit fund UI

### Phase 11 — Investments / Assets / Liabilities
- [x] 11.1 Investment portfolio CRUD
- [x] 11.2 Assets CRUD
- [x] 11.3 Liabilities CRUD
- [x] 11.4 Net worth calculation
- [x] 11.5 Frontend: All three UIs

### Phase 12 — Notifications & Reminders
- [x] 12.1 Notification model + service
- [x] 12.2 Node Cron job scheduler
- [x] 12.3 In-app notification bell
- [x] 12.4 Email reminders
- [x] 12.5 Frontend: Notifications panel

### Phase 13 — Reports & Export
- [x] 13.1 Monthly/yearly report APIs
- [x] 13.2 Category-wise + member-wise reports
- [x] 13.3 PDF export (pdfkit)
- [x] 13.4 Excel export (exceljs)
- [x] 13.5 Frontend: Reports page + export buttons

### Phase 14 — AI Insights
- [x] 14.1 Spending pattern analysis
- [x] 14.2 Budget recommendations
- [x] 14.3 Anomaly detection
- [x] 14.4 Frontend: Insights cards

### Phase 15 — Admin Panel ✅
- [x] 15.1 Super admin auth + panel
- [x] 15.2 User/family management
- [x] 15.3 Platform analytics
- [x] 15.4 Audit log viewer
- [x] 15.5 Announcement system
- [x] 15.6 Frontend: Admin panel

### Phase 16 — Subscription System ✅
- [x] 16.1 Subscription plans (Free/Pro/Family) — plan definitions, feature gates, member limits
- [x] 16.2 Plan feature gates — backend validation of plan transitions, member limit checks
- [x] 16.3 Subscription CRUD API — get current, upgrade, cancel, reactivate, plan status
- [x] 16.4 Frontend: Pricing + upgrade UI — plan cards, current subscription info, cancel/reactivate

### Phase 17 — Polish & Deployment ✅
- [x] 17.1 Dark mode — already complete (ThemeProvider + toggle + CSS variables)
- [x] 17.2 Mobile responsiveness — responsive sidebar overlay, responsive padding
- [x] 17.3 Loading states — Skeleton component created, consistent loading patterns
- [x] 17.4 Error + empty states — ErrorBoundary, NotFound page, retry buttons on error states
- [x] 17.5 Docker production build — multi-stage Dockerfiles, docker-compose with app services
- [x] 17.6 Environment hardening — client .env.example, server .env.example already exists
- [x] 17.7 CI/CD pipeline setup — GitHub Actions CI workflow (server typecheck + client build)

---

## 8. Security Plan

| Layer | Implementation |
|-------|---------------|
| Transport | HTTPS enforced, HSTS header via Helmet |
| Auth | JWT (15min access token) + refresh token rotation (7-day httpOnly cookie) |
| Password | bcrypt (rounds: 12) |
| Input | Zod validation on every request body |
| XSS | Helmet + DOMPurify on frontend |
| SQL Injection | Prisma ORM (parameterized queries only) |
| Rate Limiting | 100 req/15min (general), 5 req/15min (auth routes) |
| CORS | Whitelist-only origins |
| CSRF | SameSite=Strict cookie + custom header check |
| Tenant Isolation | Every DB query automatically scoped to familyId |
| RBAC | Permission check middleware before every protected route |
| Audit Log | Auto-logged for every CREATE/UPDATE/DELETE |
| Secrets | Dotenv + never committed; validated at startup |

---

## 9. Deployment Plan

```
Production Stack
├── Frontend:  Vercel / Nginx + Docker
├── Backend:   Docker container (Node.js)
├── Database:  PostgreSQL (managed: Supabase / Railway / RDS)
├── Cache:     Redis (Upstash / ElastiCache)
├── Files:     Cloudinary
├── Email:     Resend / SendGrid / Nodemailer + Gmail SMTP
└── CI/CD:     GitHub Actions
```

---

## 10. Done Checklist

Use this to track overall completion.

- [x] Phase 0: Foundation ✅ 2026-06-21
- [ ] Phase 1: Authentication
- [x] Phase 2: Family + RBAC
- [x] Phase 3: Income
- [x] Phase 4: Expense
- [x] Phase 5: Budget
- [x] Phase 6: Dashboard
- [x] Phase 7: EMI
- [x] Phase 8: Bills/Rent/Fees
- [x] Phase 9: Goals
- [x] Phase 10: Chit Fund
- [x] Phase 11: Investments/Assets
- [x] Phase 12: Notifications
- [x] Phase 13: Reports
- [x] Phase 14: AI Insights
- [x] Phase 15: Admin Panel
- [x] Phase 16: Subscriptions
- [x] Phase 17: Polish + Deploy

---

*This document is the single source of truth for the project. Update it as modules are completed.*
