# Terminus FE — Backend Contract

Everything on this page is what `app/src/api.ts` calls (see also `app/src/config.ts`
and `app/src/mockApi.ts` for a reference implementation). It describes exactly
what the frontend expects; a backend that returns these shapes at these paths
will drop in with no FE changes.

## Services

Two independent HTTP services:

| Service       | Base URL env var    | Default in dev            | What it owns                                    |
| ------------- | ------------------- | ------------------------- | ----------------------------------------------- |
| **pass-svc**  | `VITE_API_URL`      | `http://localhost:8080`   | Season, progress, activity, leaderboard, claim  |
| **ingest**    | `VITE_INGEST_URL`   | `http://localhost:8081`   | Event intake only (fire-and-forget via RabbitMQ)|

The FE calls `pass-svc` synchronously and treats `ingest` as best-effort — it
posts the event and then polls `/progress` waiting for the XP to land.

CORS must allow the FE origin for both services.

## Identity

There is no auth. The player id is a hard-coded constant, `player-david`
(`PLAYER_ID` in `src/config.ts`). Every URL that includes a `player_id` uses
that value. Treat it as a well-known bearer of "the demo player."

## Common conventions

- All request and response bodies are JSON.
- Timestamps are ISO-8601 in UTC (`2026-08-31T23:59:59Z`).
- Numbers are integers unless noted (`tier_progress` is a float in [0, 1]).
- Successful responses return HTTP 200 (except claim, which returns 200 as well
  — see below).

### Error envelope

All non-2xx responses share one JSON envelope:

```json
{ "error": { "code": "STRING_CODE", "message": "human-readable text" } }
```

The FE maps this to `ApiError { code, message, status }`. If the body is not
JSON or has no `error`, the FE falls back to `code = "HTTP_<status>"`.

Codes the FE reacts to specifically:

| Code                | Where it's checked   | FE behavior                                                    |
| ------------------- | -------------------- | -------------------------------------------------------------- |
| `DUPLICATE_EVENT`   | `POST /v1/events`    | Treated as success — kicks the fast poll loop like a fresh dispatch. |
| `ALREADY_CLAIMED`   | `POST .../claim`     | Treated as success — the FE was stale; it marks the tier claimed locally. |
| anything else       | any endpoint         | Surfaced (dispatch banner, or ignored on background polls).    |

The FE never inspects `message` — it's for humans reading logs.

---

## Endpoints

### 1. `GET /v1/season` — season + reward table

Called once on load (with up to 3 retries). If this fails after all retries the
FE shows a full-screen "Service Suspended" state and hides everything else.

**Response** (`SeasonResponse`):

```json
{
  "season": {
    "id": "season-01",
    "name": "Night Line 01",
    "starts_at": "2026-07-01T00:00:00Z",
    "ends_at":   "2026-08-31T23:59:59Z",
    "tier_count": 20
  },
  "tiers": [
    {
      "tier": 1,
      "xp_required": 100,
      "reward": {
        "id": "rw-001",
        "name": "Platform Badge",
        "kind": "badge",
        "icon": "badge"
      }
    }
    /* … 20 entries, indexed 1..20 */
  ]
}
```

- `tiers` MUST be sorted ascending by `tier`, one entry per tier, `1..tier_count`.
- `xp_required` is the cumulative XP threshold to *reach* that tier.
- `reward.kind` ∈ `"badge" | "currency" | "cosmetic" | "title"`.
- `reward.icon` ∈ `"badge" | "token" | "ticket" | "lamp" | "key" | "crown" | "flag" | "stamp"`
  (the FE picks a glyph by name; unknown values render as a fallback badge).

### 2. `GET /v1/players/{player_id}/progress` — current standing

Called on load and then polled every 3 s while the tab is visible; also
fast-polled (every 1 s × 5) right after a dispatched event.

**Response** (`Progress`):

```json
{
  "player_id": "player-david",
  "season_id": "season-01",
  "xp": 1340,
  "tier": 4,
  "next_tier": 5,
  "next_tier_xp": 1500,
  "tier_progress": 0.62,
  "claimed_tiers": [1, 2, 3],
  "updated_at": "2026-07-05T18:24:03Z"
}
```

Rules the FE assumes:

- `tier` is `0` before any XP is earned; increases monotonically.
- When the player has reached the terminal tier (`tier == season.tier_count`),
  `next_tier` and `next_tier_xp` are both `null` and `tier_progress` is `1`.
- Otherwise `next_tier = tier + 1`, `next_tier_xp` is the cumulative threshold
  for that tier, and `tier_progress = (xp - baseXp) / (next_tier_xp - baseXp)`
  where `baseXp` is the previous tier's threshold (or `0` for tier 0).
- `claimed_tiers` is any subset of `[1..tier]`, sorted ascending.
- `updated_at` is informational; the FE doesn't parse it for logic.

Errors are swallowed silently — the next poll retries.

### 3. `GET /v1/players/{player_id}/activity?limit={n}` — recent XP events

Called on load, and again whenever `/progress` reports a change in `xp` (so the
new arrivals line up with the flap counter). Default `limit=15`; FE never asks
for more than what fits the panel.

**Response**:

```json
{
  "events": [
    {
      "type": "match_won",
      "xp_awarded": 120,
      "occurred_at": "2026-07-05T18:24:03Z",
      "tier_after": 4,
      "unlocked_tier": null
    },
    {
      "type": "quest_completed",
      "xp_awarded": 200,
      "occurred_at": "2026-07-05T18:10:11Z",
      "tier_after": 4,
      "unlocked_tier": 4
    }
  ]
}
```

- Newest first.
- `type` ∈ `"match_won" | "match_played" | "daily_login" | "quest_completed" | "first_win_of_day"`
  (any other value renders raw).
- `unlocked_tier` is the tier this event crossed into, or `null` if the event
  didn't push the player up a tier. The FE renders it as its own "ARRIVED AT
  TIER N" row directly below the event.
- Errors are swallowed silently.

### 4. `GET /v1/leaderboard?limit={n}&player_id={self}` — standings

Called once on load (with up to 3 retries). Failure is silent — the panel just
stays blank. Default `limit=10`.

**Response** (`Leaderboard`):

```json
{
  "entries": [
    { "rank": 1, "player_id": "player-mika",  "display_name": "Mika",  "xp": 4210, "tier": 14 },
    { "rank": 2, "player_id": "player-jonas", "display_name": "Jonas", "xp": 3980, "tier": 13 }
    /* … up to limit */
  ],
  "player": {
    "rank": 23,
    "player_id": "player-david",
    "xp": 1340,
    "tier": 4
  }
}
```

- `entries` sorted by `rank` ascending.
- `display_name` is optional; when absent the FE shows `player_id`.
- `player` is optional. Include it when the caller (`player_id` query arg) is
  outside the top-`limit`; it renders as a highlighted "you are here" row at
  the bottom. If the caller is already in `entries`, omit `player`.

### 5. `POST /v1/events` — dispatch a game event (ingest service)

Sent from the Dev Console. Fire-and-forget: the FE does not wait for XP to
land here; it starts fast-polling `/progress` after a 202/200 comes back.

**Request body**:

```json
{
  "event_id":    "d5cbf3e6-8ee9-4b81-9f0a-6c5f4e0a2b1a",
  "player_id":   "player-david",
  "type":        "match_won",
  "occurred_at": "2026-07-05T18:24:03Z"
}
```

- `event_id` is a client-generated UUID v4. It's the idempotency key — the
  server MUST dedupe on it (see `DUPLICATE_EVENT` below).
- `type` — same union as `activity[].type`.

**Response** (200 or 202):

```json
{ "status": "queued", "event_id": "d5cbf3e6-…" }
```

The FE only checks the response was OK; it does not read the body.

**Errors**:

- `DUPLICATE_EVENT` (any 4xx) — replay of the same `event_id`. The FE treats
  this as success and still kicks the fast-poll, so a network retry that
  the server already saw is safe.
- Anything else — the FE surfaces "DISPATCH FAILED — SIGNAL LOST. RETRY." in
  the console.

**XP awards (server side)** — the FE labels each button with the amount it
expects the server to award for the corresponding event type:

| `type`             | XP  |
| ------------------ | --- |
| `match_won`        | 120 |
| `match_played`     |  40 |
| `daily_login`      |  25 |
| `quest_completed`  | 200 |
| `first_win_of_day` |  80 |

These are display hints; the server is authoritative and the FE shows whatever
XP the server ends up reporting in `/activity` and `/progress`.

### 6. `POST /v1/players/{player_id}/tiers/{tier}/claim` — claim a tier reward

Sent when the user clicks the CLAIM button under a reached-but-unclaimed tier.

**Request body**: `{}` (empty object; the URL carries all information).

**Response** (`ClaimResponse`):

```json
{
  "claimed": {
    "tier": 4,
    "reward": {
      "id": "rw-004",
      "name": "Route Flag",
      "kind": "cosmetic",
      "icon": "flag"
    },
    "claimed_at": "2026-07-05T18:24:07Z"
  }
}
```

**Errors** the FE recognises:

| Code               | HTTP | FE behavior                                    |
| ------------------ | ---- | ---------------------------------------------- |
| `ALREADY_CLAIMED`  | 409  | Treats as success; marks tier claimed locally. |
| `TIER_NOT_REACHED` | 409  | Silently swallowed; next `/progress` reconciles.|
| `BAD_TIER`         | 400  | Silently swallowed.                            |

Any other error is ignored — the FE relies on the next `/progress` poll to
show the true state.

---

## Behaviour the backend should know about

- **Polling cadence**: `/progress` fires every 3 s per open tab (skipped when
  hidden). After a `POST /v1/events`, the same client burst-polls it 5 more
  times at 1 s intervals. Design for that traffic.
- **Event lag**: `POST /v1/events` is expected to return well before the XP
  lands (the reference mock uses ~700 ms). The FE tolerates any delay; XP
  simply appears on a later `/progress` poll.
- **Idempotency**: `event_id` is the idempotency key on `POST /v1/events`.
  Retries with the same id must not double-award XP; return `DUPLICATE_EVENT`
  (or a 200 as if it landed — the FE handles both the same way).
- **Claim ordering**: not all lower tiers need to be claimed before a higher
  one; the FE surfaces a CLAIM button for the *highest* unclaimed reached
  tier, but a request for any reached-and-unclaimed tier is valid.
- **Retries with backoff**: `/season` and `/leaderboard` get up to 3
  no-delay retries client-side on cold load. Every other request is one-shot;
  the polling loop is the retry loop.
- **Content type**: FE always sends `Content-Type: application/json` on POSTs
  and expects JSON responses (including on errors).
