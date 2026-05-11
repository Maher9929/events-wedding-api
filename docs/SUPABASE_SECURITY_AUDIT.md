# Supabase Security Audit

This project uses the NestJS backend as the trusted data access layer. The backend uses the Supabase service role key, and the frontend should only use the anon key for realtime subscriptions and public-safe operations.

## Current hardening

- File uploads go through `POST /storage/upload` and `POST /storage/upload-multiple`.
- Anonymous direct uploads to the `attachments` bucket are removed in migration `027_harden_storage_policies.sql`.
- RLS is enabled on late payment, quote-request, and booking-notification tables in migration `028_enable_rls_on_late_tables.sql`.
- Production requires `SUPABASE_SERVICE_ROLE_KEY`.
- The service role key must never be exposed in the frontend.

## Run the audit

```bash
npm run db:security:audit
```

Strict mode:

```bash
npm run db:security:audit -- --strict
```

The audit checks:

- duplicated migration number prefixes
- tables created without RLS enabled
- broad `FOR ALL USING (true)` policies not restricted to `service_role`
- storage insert policies that allow anonymous uploads

## Known follow-up

Several old migrations contain broad policies named `Service role full access` without `TO service_role`. That is risky if the anon key is used directly against tables. The safest next hardening step is to replace frontend Supabase realtime table subscriptions with authenticated backend Socket.IO events, then restrict or remove these broad table policies.
