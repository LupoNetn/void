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
