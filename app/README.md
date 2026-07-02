# Terminus — Battle Pass Frontend

React + TypeScript implementation of the **Night Line 01** battle pass
(design handoff in `../project/Terminus.dc.html`, spec in `../chats/chat1.md`).

There is **no mock mode** — the app talks directly to the real services:

- `ingest-svc` — `http://localhost:8081` (`POST /v1/events`)
- `pass-svc` HTTP gateway — `http://localhost:8080` (season, progress, claim,
  activity, leaderboard)

Base URLs live in `src/config.ts` and can be overridden at build/dev time with
`VITE_INGEST_URL` / `VITE_API_URL`. Identity is the hardcoded
`PLAYER_ID = "player-david"` per spec — no auth.

If `pass-svc` is unreachable the app shows the SERVICE SUSPENDED screen with a
Retry button.

## Run

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build to dist/
```

Note: `pass-svc` must allow CORS from the app origin (or serve the built app
from the same origin) since the browser calls both services directly.
