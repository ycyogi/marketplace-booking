# Marketplace Booking

Multi-tenant booking platform monorepo (NestJS + Postgres + Redis + Keycloak).

## Features

- **Multi-tenant access control** (tenant context + role-based guards)
- **JWT auth via Keycloak**
- **Resources management** (list/create)
- **Bookings lifecycle**
  - hold
  - direct confirm
  - confirm existing hold
  - reschedule
  - cancel
- **Idempotency support** for mutation endpoints
- **Background worker** to expire stale holds
- **Swagger UI** for API testing at `/docs`

---

## System Architecture

### Services

- **apps/api**: HTTP API (NestJS + Fastify)
- **apps/worker**: background worker for expiring holds
- **packages/db**: DB migrations and schema evolution

### Infrastructure (docker-compose)

- **Postgres**: primary relational DB
- **Redis**: caching/idempotency support
- **Keycloak**: identity provider (JWT issuer)
- **Keycloak Postgres**: Keycloak metadata DB

### High-level flow

1. Client authenticates with Keycloak and gets JWT.
2. Client calls API with:
   - `Authorization: Bearer <token>`
   - `X-Tenant-Id: <tenant-id>`
3. API guards validate JWT, tenant membership, and role.
4. Booking operations persist to Postgres with overlap + idempotency handling.
5. Worker periodically marks expired holds as `EXPIRED`.

---

## Local Development

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker Desktop (or Docker Engine)

## 1) Install dependencies

```bash
pnpm install
```

## 2) Configure environment

Copy `.env.example` to `.env` if needed.

Current local defaults:

- Postgres: `postgres://app:app@localhost:5432/app`
- Redis: `redis://localhost:6379`
- Keycloak issuer: `http://localhost:8081/realms/appointments`

## 3) Start infra

```bash
pnpm infra:up
```

Check logs if needed:

```bash
pnpm infra:logs
```

## 4) Run DB migrations

```bash
pnpm db:migrate
```

(Optional status)

```bash
pnpm db:status
```

## 5) Start API

```bash
pnpm --filter api start:dev
```

API will be available at:

- `http://localhost:3000`
- Swagger UI: `http://localhost:3000/docs`

## 6) (Optional) Start worker

In another terminal:

```bash
pnpm --filter worker start:dev
```

---

## Testing

Run all tests in workspace:

```bash
pnpm test
```

Run with coverage:

```bash
pnpm -r test -- --coverage
```

Coverage thresholds are enforced in API/worker Jest config.

---

## Handy Commands

```bash
# start/stop infra
pnpm infra:up
pnpm infra:down

# migrations
pnpm db:migrate
pnpm db:status

# dev
pnpm --filter api start:dev
pnpm --filter worker start:dev
```
