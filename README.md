# Relay

Multi-tenant notification infrastructure with a NestJS API and a Next.js operations dashboard.

## Applications

- `backend/` — NestJS, Prisma and PostgreSQL API plus background delivery engine.
- `frontend/` — Next.js App Router dashboard.

## Development

Install dependencies from the repository root:

```bash
npm install
```

Configure `backend/.env` from `backend/.env.example`, then run the applications in separate terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

The API runs on `http://localhost:3000`; the dashboard runs on `http://localhost:3001` and proxies `/api/*` to NestJS.

## Production deployment

Deploy the NestJS API as a persistent Node service. The included `render.yaml` provisions a free Render web service, applies Prisma migrations before startup, and uses `/health/ready` for readiness checks. Set `DATABASE_URL`, `DIRECT_URL`, and `CORS_ORIGINS`; Render generates the three application secrets. Never change `ENCRYPTION_SECRET` after storing provider credentials unless those credentials are re-encrypted. Render's free service can spin down and is appropriate for demos or low-traffic evaluation; use an always-on paid instance for dependable production delivery and scheduled jobs.

Deploy the repository root to Vercel for the Next.js frontend using the included `vercel.json`. Set `BACKEND_URL` to the public HTTPS URL of the NestJS service. Set the backend's `CORS_ORIGINS` to the final frontend origin (comma-separate preview origins only when explicitly needed).

Production startup refuses placeholder or short secrets. Delivery jobs are stored in PostgreSQL, claimed atomically, retried up to three times, and stale processing jobs are recovered after two minutes. Keep at least one API instance continuously running because it also processes the durable database queue.

## Notification ingestion

Notification delivery is server-to-server only. Use an `x-api-key` header (recommended) or a workspace Bearer token:

- `POST /notifications/send` accepts one notification.
- `POST /notifications/batch` accepts 1–100 notifications and returns per-item results.

Use a unique `Idempotency-Key` for every logical request. The interactive dashboard manages API keys, provider credentials, templates, webhooks, and delivery observability; it does not originate notifications.
