# Production Deployment Checklist

This checklist is the release path for Doha Events. Follow it before each real deployment.

## 1. Prepare secrets

For Docker production, create `.env` from `.env.production.example` and replace every placeholder.

Required backend values:

- `BACKEND_IMAGE`
- `FRONTEND_IMAGE`
- `IMAGE_TAG`
- `FRONTEND_DOMAIN`
- `API_DOMAIN`
- `ACME_EMAIL`
- `NODE_ENV=production`
- `JWT_SECRET` with at least 32 characters
- `REDIS_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `APP_BASE_URL`
- `ALLOWED_ORIGINS`

For local frontend builds, create `frontend/.env` from `frontend/.env.example`.

Required frontend values:

- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`

Never expose `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, or `JWT_SECRET` in the frontend.

## 2. Prepare external services

- Supabase: apply all migrations, enable storage buckets, verify RLS policies.
- Stripe: configure the webhook endpoint: `https://api.your-domain.com/payments/webhook`.
- Stripe webhook events: payment intent lifecycle and refund events used by the backend.
- Email: configure SendGrid values if email notifications are enabled.
- Domain: point API and frontend DNS records to the deployment server.
- TLS: enable HTTPS before opening payments to real users.

## 3. Run predeploy checks

From the repository root:

```bash
npm run predeploy:check
```

The command checks:

- required files
- production environment values
- Supabase migration security audit
- backend lint, tests, and build
- frontend lint and build
- Docker Compose configuration

Useful variants:

```bash
npm run predeploy:check -- --skip-docker
npm run predeploy:check -- --skip-env
npm run predeploy:check -- --skip-db-audit
npm run predeploy:check -- --skip-frontend-build
```

Use skip flags only for local debugging, not for the final production release.

## 4. Deploy with Docker Compose

```bash
chmod +x deploy.sh
BACKEND_URL=https://api.your-domain.com FRONTEND_URL=https://your-domain.com ./deploy.sh production
```

The production compose file starts:

- Caddy reverse proxy with automatic HTTPS
- backend API on the internal Docker network
- frontend Nginx on the internal Docker network
- Redis cache on the internal Docker network

The script validates Docker Compose, pulls/builds images, starts services, and checks:

- `GET /health` on the backend
- frontend HTTP availability

To force the script to run the Node.js predeploy checks before Docker deployment:

```bash
RUN_PREDEPLOY_CHECK=true ./deploy.sh production
```

Manual equivalent:

```bash
docker compose --env-file .env -f docker-compose.prod.yml config
docker compose --env-file .env -f docker-compose.prod.yml up -d --pull always --remove-orphans
docker compose --env-file .env -f docker-compose.prod.yml ps
docker compose --env-file .env -f docker-compose.prod.yml logs --tail=80
```

## 5. Post-deployment smoke test

Check these flows immediately after deployment:

- `GET https://api.your-domain.com/health`
- create a client account
- create or approve a provider account
- search services
- send a quote request
- provider sends a quote
- client books from an accepted quote
- pay deposit with Stripe test mode first
- download invoice PDF
- verify notifications for quote, booking, and payment

## 6. Go-live rules

- Use live Stripe keys only after test mode is fully validated.
- Restrict `ALLOWED_ORIGINS` to real frontend domains.
- Keep Swagger disabled in production.
- Keep Supabase service role key server-only.
- Enable Supabase backups.
- Configure Sentry before real user traffic.
- Keep logs for payment, refund, admin role changes, and provider verification.

## 7. GitHub CD secrets

The production workflow `.github/workflows/cd.yml` expects these secrets:

- `SERVER_HOST`
- `SERVER_USER`
- `SERVER_SSH_KEY`
- `FRONTEND_DOMAIN`
- `API_DOMAIN`
- `ACME_EMAIL`
- `REDIS_PASSWORD`
- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `SENTRY_DSN`
