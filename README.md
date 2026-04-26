# DOHA EVENTS — Wedding & Events Services Marketplace

Web marketplace connecting event organizers with service providers for events (weddings, engagements, birthdays, corporate).

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Modules](#modules)
- [User Roles](#user-roles)
- [Local Installation](#local-installation)
- [Environment Variables](#environment-variables)
- [Docker](#docker)
- [Tests](#tests)
- [CI/CD](#cicd)
- [Security](#security)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Database](#database)
- [Internationalization](#internationalization)

---

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    Frontend       │     │    Backend        │     │    Supabase      │
│  React + Vite    │────>│  NestJS + TS     │────>│  PostgreSQL      │
│  TailwindCSS     │     │  JWT Auth        │     │  Auth + Storage  │
│  i18n (AR/FR/EN) │     │  Swagger API     │     │  Realtime        │
└──────────────────┘     └────────┬─────────┘     └──────────────────┘
                                  │
                         ┌────────┴─────────┐
                         │     Stripe       │
                         │  Payments API    │
                         └──────────────────┘
```

**Optional monitoring**: Prometheus + Grafana + Redis (via Docker profiles)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | NestJS 11 + TypeScript 5 |
| **Frontend** | React 19 + TypeScript + Vite |
| **Database** | Supabase PostgreSQL |
| **Authentication** | JWT + Supabase Auth |
| **Payments** | Stripe (PaymentIntents, webhooks, refunds) |
| **Storage** | Supabase Storage |
| **Styling** | TailwindCSS |
| **Unit Tests** | Jest + jest-junit (278 tests, 23 suites) |
| **E2E Tests** | Cucumber + Selenium WebDriver (10 scenarios) |
| **CI/CD** | GitHub Actions (ci.yml + cd.yml) + Jenkins (Jenkinsfile) |
| **Containerization** | Docker + Docker Compose |
| **Monitoring** | Sentry, Prometheus, Grafana |
| **Security** | Helmet, CORS, ThrottlerGuard, ValidationPipe |

---

## Modules

| Module | Description |
|--------|-------------|
| `users` | Registration, login, profiles, roles, search |
| `auth` | JWT strategy, guards (JwtAuthGuard, RolesGuard) |
| `providers` | Provider profiles, availability, KYC, statistics, response rate |
| `services` | Marketplace catalog, categories, filters, featured services |
| `events` | Event management, budget, checklist, timeline, guests |
| `quotes` | Quote requests and provider offers |
| `messages` | Real-time conversations, internal messaging, anti-disintermediation |
| `bookings` | Bookings, status tracking, price locking |
| `payments` | Stripe PaymentIntents, deposit/balance, refunds, PDF invoices |
| `reviews` | Reviews, ratings, reporting |
| `moderation` | Admin moderation, reports, KYC verification |
| `notifications` | Real-time application notifications |
| `disputes` | Disputes between clients and providers |
| `categories` | Service category management |
| `common` | Content filtering, data masking, audit logs, storage, interceptors, filters |

---

## User Roles

| Role | Permissions |
|------|------------|
| **client** | Create events, request quotes, book, pay, leave reviews |
| **provider** | Manage profile/services/calendar, respond to quotes, manage bookings |
| **admin** | Manage users, categories, moderation, KYC, supervision, audit logs |

---

## Local Installation

### Prerequisites

- Node.js >= 18
- npm >= 9
- Chrome (for Selenium E2E tests)
- Supabase account (database + auth)
- Stripe account (payments)

### Backend

```bash
git clone <repo-url>
cd backend
npm install
cp .env.example .env     # Fill in the variables
npm run start:dev         # http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

### Production Build

```bash
# Backend
npm run build

# Frontend
cd frontend
npm run build             # Generates dist/
```

---

## Environment Variables

Create a `.env` file at the project root:

```env
# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your_jwt_secret

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# App URL (used in email templates)
APP_BASE_URL=https://yourdomain.com

# SendGrid (email notifications)
SENDGRID_API_KEY=SG.YOUR_SENDGRID_API_KEY
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=Events & Wedding Marketplace

# Frontend (in frontend/.env)
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Optional
SENTRY_DSN=https://xxx@sentry.io/xxx
ALLOWED_ORIGINS=http://localhost,http://127.0.0.1
```

---

## Docker

### Standard Launch

```bash
cp .env.example .env
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| Backend API | http://localhost:3000 |
| Swagger | http://localhost:3000/api |

### With monitoring (Redis + Prometheus + Grafana)

```bash
docker compose --profile cache --profile observability up --build
```

| Service | URL |
|---------|-----|
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 (admin / set via `GRAFANA_ADMIN_PASSWORD`) |
| Redis | localhost:6379 |

### Architecture Docker

- **backend**: Node 18 Alpine, multi-stage build, healthcheck, non-root user
- **frontend**: Vite build + Nginx
- **redis**: Optional cache (profile `cache`)
- **prometheus + grafana**: Optional monitoring (profile `observability`)

---

## Tests

### Unit Tests (Jest)

```bash
npm test                          # Run all tests
npm run test:cov                  # With coverage
npm run test:junit                # Generates test/reports/junit-report.xml
```

**278 tests** across **23 suites**:

| Suite | Tests | Description |
|-------|-------|-------------|
| `bookings.service.spec.ts` | 5 | Bookings (findOne, updateStatus) |
| `bookings.controller.spec.ts` | 9 | Bookings controller |
| `payments.service.spec.ts` | 8 | Stripe payments (create, confirm, refund) |
| `disputes.service.spec.ts` | 4 | Disputes (create, getMyDisputes) |
| `common.spec.ts` | 14 | Content filtering, email/phone masking |
| `dto-validation.spec.ts` | 28 | DTO validation (CreateUser, CreateBooking, CreateReview, CreateMessage) |
| `services.service.spec.ts` | 7 | Service catalog |
| `users.service.spec.ts` | 9 | Users |
| `users.controller.spec.ts` | 6 | Users controller |
| `providers.service.spec.ts` | 19 | Providers (create, find, update, rating, KYC) |
| `messages.service.spec.ts` | 9 | Messages (conversations, send, mark read) |
| `categories.controller.spec.ts` | 8 | Categories controller |
| `events.controller.spec.ts` | 8 | Events controller |
| `events.service.spec.ts` | 16 | Events service |
| `reviews.controller.spec.ts` | 7 | Reviews controller |
| `reviews.service.spec.ts` | 8 | Reviews service |
| `quotes.service.spec.ts` | 9 | Quotes service |
| `app.service.spec.ts` | 5 | Health check (DB + cache) |
| `auth-cache.service.spec.ts` | 12 | Auth cache (blacklist, token rotation) |
| `notifications.service.spec.ts` | 5 | Email notifications |
| `notifications.controller.spec.ts` | 13 | Notifications CRUD (get, read, delete, cleanup) |
| `messages.gateway.spec.ts` | 8 | WebSocket gateway (auth, rooms, emit, typing) |

### E2E Tests (Selenium + Cucumber)

```bash
npm run test:ui                   # Starts backend + frontend + tests + report
```

**10 scenarios** across **6 features**:

| Feature | Scenarios |
|---------|-----------|
| `auth.feature` | Registration, Login |
| `services.feature` | Catalog, Service creation |
| `booking-payment.feature` | Booking, Stripe payment |
| `events.feature` | Event creation, Checklist |
| `quotes-messaging.feature` | Quote request |
| `admin.feature` | Admin dashboard |

### Reports

| Report | Location |
|--------|----------|
| JUnit XML (Jest) | `test/reports/junit-report.xml` |
| JUnit XML (Cucumber) | `test/reports/cucumber-junit.xml` |
| Cucumber JSON | `test/reports/cucumber-report.json` |
| HTML Report | `test/reports/test-report.html` |
| Error screenshots | `test/reports/screenshots/` |
| Error HTML dumps | `test/reports/html-dumps/` |
| Backend logs | `test/reports/backend.log` |
| Frontend logs | `test/reports/frontend.log` |

### Headed mode (see the browser)

```powershell
$env:SELENIUM_HEADLESS="false"; npm run test:ui
```

---

## CI/CD

### GitHub Actions

**`ci.yml`** — Triggered on push/PR to `main` and `develop`:

| Job | Steps |
|-----|-------|
| **Backend** | Install > TSC check > Tests + coverage > Build > Upload artifacts |
| **Frontend** | Install > TSC check > Build > Upload artifacts |
| **Docker Validate** | Build Docker images (PR only) |

**`cd.yml`** — Continuous deployment (Docker image publish to GHCR)

### Jenkins

**`Jenkinsfile`** — Pipeline with 6 stages:

1. **Install Dependencies** — `npm ci` backend + frontend
2. **TypeScript Check** — `tsc --noEmit` in parallel
3. **Unit Tests** — Jest → JUnit XML → Jenkins `junit` step
4. **Test Coverage** — Coverage HTML published in Jenkins
5. **E2E Tests** — Selenium + Cucumber → JUnit XML + HTML report + archived screenshots
6. **Build** — NestJS build + Vite build in parallel

---

## Security

### Implemented Measures

| Measure | Detail |
|---------|--------|
| **Helmet** | Secure HTTP headers (XSS, clickjacking, MIME sniffing) |
| **CORS** | Strictly controlled origins via `ALLOWED_ORIGINS` |
| **Global Rate Limiting** | 100 requests/min per IP (`ThrottlerGuard`) |
| **Login Rate Limiting** | 5 attempts/min |
| **Register Rate Limiting** | 3 attempts/min |
| **Payment Rate Limiting** | 10 creations/min, 3 refunds/min |
| **Message Rate Limiting** | 20 messages/min, 5 conversations/min |
| **Stripe Webhook** | Exempt from rate limiting (`@SkipThrottle`) |
| **ValidationPipe** | `whitelist: true`, `forbidNonWhitelisted: true` |
| **JWT Auth** | Bearer token on all protected endpoints |
| **Roles Guard** | Role-based access control (client, provider, admin) |
| **Anti-disintermediation** | Automatic filtering of phone numbers, emails, social links in messages |
| **Data Masking** | Email/phone masking in public provider profiles |
| **Audit Logs** | Critical action logging (admin) |
| **Global Exception Filter** | No stack trace leaks in production |
| **Docker non-root** | Backend container runs under `nestjs` user |
| **Sentry** | Production error monitoring (optional) |

---

## API Reference

Full Swagger documentation: **http://localhost:3000/api**

### Main Endpoints

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| `POST` | `/users/register` | Register | No |
| `POST` | `/users/login` | Login | No |
| `GET` | `/users/profile` | Current profile | JWT |
| `GET` | `/users/search?q=` | Search users | JWT |
| `GET` | `/services` | Service catalog | No |
| `GET` | `/services/featured` | Featured services | No |
| `POST` | `/services` | Create a service | JWT (provider) |
| `GET` | `/providers` | List providers | No |
| `GET` | `/providers/id/:id` | Provider profile (masked) | No |
| `POST` | `/events` | Create an event | JWT (client) |
| `GET` | `/events/my-events` | My events | JWT |
| `POST` | `/quotes/request` | Request a quote | JWT (client) |
| `POST` | `/bookings` | Create a booking | JWT |
| `POST` | `/payments/create-intent/:id` | Create a PaymentIntent | JWT |
| `POST` | `/payments/confirm/:id` | Confirm a payment | JWT |
| `POST` | `/payments/refund/:id` | Refund | JWT |
| `POST` | `/payments/webhook` | Stripe webhook | Stripe |
| `GET` | `/messages/conversations` | My conversations | JWT |
| `POST` | `/messages` | Send a message | JWT |
| `POST` | `/disputes` | Open a dispute | JWT |
| `GET` | `/notifications` | My notifications | JWT |
| `GET` | `/categories` | List categories | No |

---

## Project Structure

```
backend/
├── src/
│   ├── auth/               # JWT strategy, guards
│   ├── users/              # Registration, login, profiles
│   ├── providers/          # Provider profiles, KYC
│   ├── services/           # Marketplace catalog
│   ├── events/             # Events, budget, checklist, guests
│   ├── quotes/             # Quotes
│   ├── messages/           # Real-time messaging
│   ├── bookings/           # Bookings
│   ├── payments/           # Stripe, PDF invoices
│   ├── reviews/            # Reviews and ratings
│   ├── moderation/         # Admin moderation, KYC
│   ├── notifications/      # Notifications
│   ├── disputes/           # Disputes
│   ├── categories/         # Categories
│   ├── common/             # Shared utilities
│   │   ├── content-filter.ts       # Anti-disintermediation
│   │   ├── data-masking.ts         # Sensitive data masking
│   │   ├── audit-log.service.ts    # Audit logs
│   │   ├── storage.controller.ts   # File upload
│   │   ├── filters/                # Global exception filter
│   │   └── interceptors/           # Transform interceptor
│   ├── config/             # Supabase config
│   ├── app.module.ts       # Root module
│   └── main.ts             # Bootstrap (helmet, CORS, Swagger)
│
├── frontend/
│   ├── src/
│   │   ├── pages/          # React pages
│   │   ├── components/     # Reusable components
│   │   ├── services/       # API services (auth, messages, events...)
│   │   ├── locales/        # ar.json, fr.json, en.json
│   │   └── types/          # TypeScript types
│   └── Dockerfile
│
├── test/
│   ├── features/           # Gherkin .feature files
│   │   └── step-definitions/   # Selenium steps + hooks
│   ├── reports/            # Generated reports (JUnit, HTML, screenshots)
│   ├── run-cucumber.js     # E2E orchestrator
│   └── generate-report.js  # HTML report generator
│
├── supabase/
│   └── migrations/         # 26 SQL migration files
│
├── .github/workflows/
│   ├── ci.yml              # CI: tests + build
│   └── cd.yml              # CD: Docker publish
│
├── Dockerfile              # Multi-stage Node 18 Alpine
├── docker-compose.yml      # Backend + Frontend + Redis + Prometheus + Grafana
├── Jenkinsfile             # Pipeline Jenkins
├── cucumber.js             # Config Cucumber
└── package.json
```

---

## Database

**26 SQL migrations** in `supabase/migrations/`:

Main tables: `user_profiles`, `providers`, `services`, `categories`, `events`, `event_tasks`, `event_budgets`, `event_guests`, `event_timeline`, `conversations`, `messages`, `quotes`, `bookings`, `payments`, `reviews`, `reports`, `kyc_documents`, `notifications`, `disputes`, `audit_logs`

---

## Internationalization

3 supported languages:

| Language | File | Direction |
|----------|------|-----------|
| Arabic | `frontend/src/locales/ar.json` | RTL |
| French | `frontend/src/locales/fr.json` | LTR |
| English | `frontend/src/locales/en.json` | LTR |

The frontend detects the browser language and allows dynamic switching via a selector in the navigation bar.
