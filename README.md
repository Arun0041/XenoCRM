# Xeno CRM — AI-Native Mini CRM for Reaching Shoppers

A production-quality, AI-native Mini CRM built for D2C/retail brands. Helps marketers decide **who to talk to** (segmentation), **what to say** (AI-assisted messaging), and **reach them** (campaign dispatch) — with full delivery tracking via a two-service callback architecture.

> Built for BrewCo, a fictional coffee chain brand with 50+ shoppers across 5 Indian cities.

---

## Architecture

```
┌──────────────────┐     ┌───────────────────────┐     ┌──────────────────┐
│                  │     │                       │     │                  │
│    React App     │────▶│   CRM Backend (3001)  │────▶│  Channel Stub    │
│    (Vite 5173)   │     │   Express + BullMQ    │     │  (Express 3002)  │
│                  │◀────│                       │◀────│                  │
│  • Dashboard     │ SSE │  • Segmentation       │ CB  │  • Simulate      │
│  • Customers     │     │  • Campaign Dispatch   │     │    delivery      │
│  • Segments      │     │  • Webhook Receipt     │     │  • Async         │
│  • Campaigns     │     │  • AI Service (Ollama) │     │    callbacks     │
│  • Insights      │     │  • SSE Manager         │     │  • Per-channel   │
│                  │     │                       │     │    outcome rates  │
└──────────────────┘     └───────────┬───────────┘     └──────────────────┘
                                     │
                         ┌───────────┴───────────┐
                         │                       │
                    ┌────┴────┐            ┌─────┴─────┐
                    │PostgreSQL│            │   Redis   │
                    │  (5432)  │            │  (6379)   │
                    │ 6 tables │            │  BullMQ   │
                    └──────────┘            └───────────┘
```

### Message Delivery Flow

```
Campaign Send ──▶ Personalize ──▶ Enqueue (BullMQ) ──▶ Worker POSTs to Channel Stub
                                                              │
Channel Stub accepts immediately                              │
  └── Simulates: delivered/opened/read/clicked/failed         │
      └── Async callbacks (with retry) ──▶ CRM /receipt ──▶ Update DB
                                                              │
                                            SSE push ◀────────┘
                                              │
                                    Frontend updates live ◀──┘
```

---

## Setup Instructions

### Prerequisites
- **Node.js** 18+
- **PostgreSQL** 14+
- **Redis** 7+ (or use Docker: `docker run -p 6379:6379 redis`)
- **Ollama** (optional, for AI features): https://ollama.com

### 1. Clone & Install

```bash
git clone <repo-url>
cd xeno-crm
npm install
```

### 2. Environment Setup

```bash
# Copy the example and edit with your credentials
cp .env.example packages/crm-backend/.env
cp .env.example packages/channel-stub/.env

# Edit packages/crm-backend/.env:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/xenocrm
# REDIS_URL=redis://localhost:6379
```

### 3. Database Setup

```bash
# Create database
psql -U postgres -c "CREATE DATABASE xenocrm;"

# Run schema
npm run db:setup

# Seed with demo data (50 customers, orders, 4 segments, 2 campaigns)
npm run seed
```

### 4. (Optional) Start Ollama for AI Features

```bash
ollama pull llama3
ollama serve
```

> If Ollama is not running, AI features gracefully fall back to keyword-based parsing and template messages.

### 5. Start Development

```bash
npm run dev
```

This starts all 3 services concurrently:
- **Frontend**: http://localhost:5173
- **CRM Backend**: http://localhost:3001
- **Channel Stub**: http://localhost:3002

---

## Key Design Decisions

1. **BullMQ queue with concurrency:10** — each campaign send enqueues one job per recipient. Workers process max 10 simultaneously. If the channel stub returns 5xx, the job retries with exponential backoff (2s, 4s, 8s). After 3 failures, the job is dead-lettered and the recipient is marked `failed`.

2. **Forward-only status transitions** — the SQL update query checks that the new status is further along the lifecycle (`queued → sent → delivered → opened → read → clicked`) using `ARRAY_POSITION`. A `read` event cannot downgrade a `clicked` status. Enforced in SQL, not application logic.

3. **Idempotency key** — every `message_log` row has an `idempotency_key` = `{campaignId}:{customerId}`. The receipt webhook uses this as the lookup key. Duplicate callbacks for the same `(messageLogId, status)` pair hit `ON CONFLICT DO NOTHING` in `message_events`.

4. **SSE over polling** — the frontend opens a persistent EventSource connection per campaign detail page. When a callback updates stats, the `sseManager` pushes the new aggregate to all listening connections immediately. No polling interval needed.

5. **PostgreSQL connection pool** — `pg.Pool` with `max: 10`. Prevents connection exhaustion. All queries go through the pool, never a raw `Client`.

6. **Partial send resilience** — if some jobs fail permanently, the campaign ends as `partially_failed` not `failed`. Determined when all jobs for that campaign have reached a terminal status.

7. **Personalization before enqueue** — message personalization (`{{name}}` → "Priya") happens before the job is enqueued, not in the worker. The worker's job data already contains the final personalized message. Simpler worker logic, easier to inspect job payloads.

---

## What I'd Do Differently at Scale

| Area | Current | At Scale |
|------|---------|----------|
| **Auth** | None (commented `TODO`) | JWT + role-based access control |
| **Database** | Single PostgreSQL | Read replicas, connection pooler (PgBouncer) |
| **Queue** | Single Redis | Redis Cluster, separate queues per channel |
| **SSE** | In-memory Map | Redis Pub/Sub for multi-instance broadcasting |
| **Rate Limiting** | None | Express rate-limit + per-customer throttling |
| **A/B Testing** | Not implemented | Message variant testing with statistical significance |
| **Horizontal Scaling** | Single Express instance | Kubernetes with auto-scaling, separate worker pods |
| **Monitoring** | Console logs | Prometheus + Grafana, Sentry for errors |
| **Real Messaging** | Channel stub | Twilio/Gupshup integration with provider failover |

---

## API Reference

### CRM Backend (port 3001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | List customers with filters |
| POST | `/api/customers` | Create single customer |
| POST | `/api/customers/import` | Bulk import (JSON array) |
| GET | `/api/customers/stats` | Aggregate stats |
| GET | `/api/segments` | List all segments |
| POST | `/api/segments` | Create segment |
| GET | `/api/segments/:id/customers` | Preview customers in segment |
| POST | `/api/segments/ai-resolve` | AI: NL → filters + customers |
| POST | `/api/segments/preview` | Preview filters without saving |
| GET | `/api/campaigns` | List all campaigns |
| GET | `/api/campaigns/recent` | Recent campaigns (dashboard) |
| POST | `/api/campaigns` | Create campaign |
| GET | `/api/campaigns/:id` | Get campaign with stats |
| POST | `/api/campaigns/:id/send` | Dispatch campaign |
| GET | `/api/campaigns/:id/logs` | Message logs (paginated) |
| GET | `/api/campaigns/:id/stream` | SSE live stats |
| POST | `/api/webhooks/receipt` | Delivery callback (idempotent) |
| POST | `/api/ai/draft-message` | AI message drafting (streaming) |
| POST | `/api/ai/insight` | AI campaign insight (streaming) |
| GET | `/api/ai/status` | Check Ollama availability |
| GET | `/api/health` | Health check |

### Channel Stub (port 3002)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/send` | Accept message, simulate delivery |
| GET | `/health` | Health check |

---

## Tech Stack

- **Frontend**: React 18 + Vite 5, React Router v6, Tailwind CSS 3, Recharts, Lucide React
- **Backend**: Node.js + Express 4, raw `pg` (no ORM), BullMQ + ioredis
- **Database**: PostgreSQL (6 tables, raw SQL)
- **Cache/Queue**: Redis (BullMQ)
- **AI**: Ollama (Llama 3) with graceful fallback
- **Real-time**: Server-Sent Events (SSE)

---

## Tradeoffs

- **No authentication** — `// TODO: Add JWT auth for production`
- **No A/B testing** — future scope
- **No real messaging provider** — channel stub is intentional for the assignment
- **No horizontal scaling** — single Express instance is fine for demo
- **No rate limiting on APIs** — mentioned as scale improvement above
