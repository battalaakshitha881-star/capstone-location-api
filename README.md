\# Capstone Location API



A REST API serving India's administrative location hierarchy (State → District → Sub-District → Village), built on official MDDS government data.



\## Tech Stack

\- Node.js + Express.js

\- PostgreSQL (NeonDB) + Prisma ORM

\- JWT (jsonwebtoken) for admin authentication



\## Phase 1 — Core Data Layer

\- Normalized (3NF) schema: Country → State → District → SubDistrict → Village

\- Seed data and a tested bulk import script for MDDS-format CSV/Excel files

\- Basic endpoints: /api/v1/states, /districts, /subdistricts, /villages, /states/:id/full



\## Phase 2 — API Productization

All endpoints now live under `/v1/` and require an API key.



\### Authentication

\- `X-API-Key` header required on every `/v1/\*` route

\- `POST /v1/admin/login` — returns a signed JWT (24h expiry) for admin routes



\### Standard Response Format

Every response follows:

```json

{ "success": true, "count": 3, "data": \[...], "meta": { "requestId": "...", "responseTime": 23 } }

```

Errors follow:

```json

{ "success": false, "error": { "code": "INVALID\_API\_KEY", "message": "..." } }

```



\### Endpoints

| Method | Endpoint | Description |

|---|---|---|

| GET | /v1/states | List all states |

| GET | /v1/states/:id/districts | Districts in a state |

| GET | /v1/districts/:id/subdistricts | Sub-districts in a district |

| GET | /v1/subdistricts/:id/villages | Villages in a sub-district (paginated) |

| GET | /v1/search?q= | Search villages by name |

| GET | /v1/autocomplete?q= | Typeahead suggestions |

| POST | /v1/admin/login | Admin JWT login |



\### Rate Limiting

\- Daily quota per API key (in-memory demo, 5,000/day default)

\- `X-RateLimit-Limit` / `X-RateLimit-Remaining` headers on every response

\- Over-limit requests return `429 RATE\_LIMITED`



\### Admin Tooling

\- `public/browser.html` — Village Data Browser (state-filtered live table)

\- `public/demo.html` — Demo client contact form with live village autocomplete



\## Demo API Key

```

ak\_demo1234567890abcdef1234567890ab

```



\## Running Locally

```

npm install

node server.js

```

Visit `http://localhost:3000/browser.html` or `http://localhost:3000/demo.html`.



\## Scoped for Later Phases

\- Full React + TypeScript admin dashboard with analytics (Section 7-8)

\- B2B self-registration portal and key management UI (Section 9)

\- bcrypt-hashed keys, security headers, 2FA (Section 10)

\- Redis-backed plan tiers (Section 11)

\- Vercel staging/production deployment (Section 12)



\## Status

Phase 1: Complete. Phase 2: Core API, auth, rate limiting, admin browser, and demo client complete.

