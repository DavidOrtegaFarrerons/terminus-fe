# Terminus Frontend

React + TypeScript app for the **Night Line 01** battle pass.

## Quick start

The fastest way to see it running — no backend, no npm install:

```sh
make docker-mock
# then open http://localhost:5173
```

The mock is in-memory: state resets on page reload. Dispatch events from the
Event Console to earn XP and unlock tiers.

## All commands

```sh
make help
```

| Command | What it does |
| --- | --- |
| `make dev` | Local vite dev server, expects real backends on `:8080` / `:8081` |
| `make dev-mock` | Local vite dev server with in-app mock (no backend needed) |
| `make build` | Typecheck + production build to `app/dist` |
| `make docker` | Docker compose up, real backends expected |
| `make docker-mock` | Docker compose up with mock enabled |
| `make down` | Stop containers |

## Mock vs real

The switch is a single env var: `VITE_MOCK=true`. When set, `src/api.ts` routes
every call through `src/mockApi.ts` instead of `fetch`. Nothing else in the app
changes — same components, same polling behavior.

When you want to talk to real services, unset the flag (or run `make dev` /
`make docker`) and point at your backend with:

```sh
VITE_API_URL=https://pass-svc.example.com \
VITE_INGEST_URL=https://ingest-svc.example.com \
make docker
```

## Layout

```
app/            React + Vite source
  src/api.ts    Real HTTP client (routes to mockApi when VITE_MOCK=true)
  src/mockApi.ts  In-memory mock backend
Makefile        Convenience wrappers
docker-compose.yml  App container, env-driven mock flag
```
