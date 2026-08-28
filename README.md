\# Capstone Location API



A REST API serving India's administrative location hierarchy (State → District → Sub-District → Village), built on official MDDS government data.



\## Tech Stack

\- Node.js + Express.js

\- PostgreSQL (NeonDB) + Prisma ORM



\## Endpoints

\- GET /api/v1/states

\- GET /api/v1/districts

\- GET /api/v1/subdistricts

\- GET /api/v1/villages

\- GET /api/v1/states/:id/full — full nested hierarchy for a state



\## Status

Phase 1: Core schema, database, and API layer complete.

