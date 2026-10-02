# MARSIS API

Stores colony designs and simulation runs for the colony simulator (`/simulator` in the frontend) in Postgres (Neon).
The simulation itself runs in the browser; this service only persists it.

## Setup

```bash
cd Backend
npm install
cp .env.example .env      # then paste your Neon connection string into DATABASE_URL
npm run dev               # http://localhost:8787 — applies db/schema.sql on start
```

In another terminal run the frontend (`cd Frontend && npm run dev`). Vite proxies `/api` to port 8787.
The simulator's top bar shows **Database** when it is connected and **Browser storage** when it isn't
(without the API, designs and runs are kept in the browser's localStorage).

## Authentication (Microsoft Entra ID)

The API validates Entra ID access tokens sent as `Authorization: Bearer <token>` (`src/auth.js`):
signature against the tenant's published keys, issuer (v1 or v2), audience (`AZURE_API_CLIENT_ID` /
`api://…`), expiry, the `access_as_user` scope, and that the calling app is in `AZURE_ALLOWED_CLIENT_IDS`.

| Variable | Value |
|---|---|
| `AZURE_TENANT_ID` | Directory (tenant) ID |
| `AZURE_API_CLIENT_ID` | Application ID of the **API** registration |
| `AZURE_API_APP_ID_URI` | `api://<API client id>` |
| `AZURE_REQUIRED_SCOPE` | `access_as_user` |
| `AZURE_ALLOWED_CLIENT_IDS` | Application ID(s) of the **SPA** registration allowed to call the API |
| `AZURE_SPA_CLIENT_ID` | SPA client ID, returned by `/api/health` so the frontend can configure MSAL |
| `AUTH_MODE` | `off`, `optional` (default) or `required` |

- **optional**: anonymous requests work; requests with a valid token are tied to that user. A bad token is always rejected.
- **required**: every `/api` route except `/api/health` returns 401 without a valid token.

Each signed-in user only sees their own colonies and runs (`owner_oid` = the token's `oid`).
Anonymous saves have `owner_oid = NULL` and stay separate. `GET /api/me` returns the signed-in user.

## Tables (`db/schema.sql`)

| Table | Contents |
|---|---|
| `colonies` | Builder designs: name, site, population, full config (jsonb) |
| `simulation_runs` | One row per run: sol reached, status, headline metrics, full engine snapshot for resuming |
| `run_incidents` | Incident history per run: type, severity, location, status, responsible, resources needed |

## Endpoints

| Method | Path | |
|---|---|---|
| GET | `/api/health` | `{ ok, db, auth }` (public) |
| GET | `/api/me` | the signed-in user, 401 if anonymous |
| GET / POST | `/api/colonies` | list / create a design |
| GET / PUT / DELETE | `/api/colonies/:id` | read / upsert / delete a design |
| GET | `/api/runs` | list saved runs |
| GET / PUT / DELETE | `/api/runs/:id` | read / upsert (with incidents) / delete a run |
| GET | `/api/runs/:id/incidents` | incident history for a run |

## Environment

| Variable | Default | |
|---|---|---|
| `DATABASE_URL` | — | Neon connection string (`...?sslmode=require`) |
| `PORT` | `8787` | |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | CORS origins, comma-separated, for calling the API without the Vite proxy |
| `PG_POOL_MAX` | `5` | Connection pool size |

For a production frontend on a different host, build it with `VITE_API_URL=https://your-api.example.com/api`
and add that frontend's origin to `ALLOWED_ORIGINS`. The host serving the frontend must fall back to
`index.html` for `/simulator` (SPA routing).
