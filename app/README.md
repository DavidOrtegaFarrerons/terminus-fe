# Terminus — Battle Pass Frontend

React + TypeScript implementation of the **Night Line 01** battle pass.

Base URLs live in `src/config.ts` and can be overridden with the following env
vars at build/dev time:

- `VITE_MOCK` — `true` to use the in-app mock, `false` (default) for real HTTP
- `VITE_API_URL` — `pass-svc` gateway, default `http://localhost:8080`
- `VITE_INGEST_URL` — `ingest-svc`, default `http://localhost:8081`
- `VITE_START_XP` — mock only: seed XP the demo starts with (default `1340`)
- `VITE_FAILURE_RATE` — mock only: 0–1 chance each request errors out (default `0.05`)

Identity is the hardcoded `PLAYER_ID = "player-david"` — no auth.

If `pass-svc` is unreachable the app shows the SERVICE SUSPENDED screen with a
Retry button.

## Run locally

```sh
npm install
npm run dev              # real API expected on :8080 / :8081
VITE_MOCK=true npm run dev   # in-app mock, no backend needed
npm run build            # typecheck + production build to dist/
```

Or from the repo root, use the `make` targets — see `../README.md`.

## Mock mode

`src/mockApi.ts` holds an in-memory copy of the season, progress, activity, and
leaderboard. State resets when the page reloads. `src/api.ts` checks
`IS_MOCK` (from `src/config.ts`) and dispatches each call to either mock or
real HTTP.

## CORS note (real mode only)

`pass-svc` must allow CORS from the app origin (or serve the built app from
the same origin) since the browser calls both services directly.
