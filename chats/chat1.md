# Terminus Battle Pass Spec

_Started 2026-07-02 18:20 UTC_

---

## User

Battle Pass — API & Frontend Spec

Project codename: Terminus. The season is a night-train line; tiers are stations; the player's XP moves the train down the line. This metaphor drives both the API naming and the visual design.


Part 1 — Architecture & Endpoints

Three services. The frontend only talks to two HTTP surfaces (ingest-svc and the pass-svc HTTP gateway). gRPC stays internal.

[Frontend SPA]
   │  POST events            │  GET/POST JSON
   ▼                         ▼
[ingest-svc :8081]      [pass-svc gateway :8080]
   │ publish                 │ grpc-gateway → gRPC :50051
   ▼                         │
[RabbitMQ] ──► [progression-svc] ──► [PostgreSQL]
                    │                [Redis: cache + leaderboard]
                    └─► tier_unlocked fanout

All responses are JSON, Content-Type: application/json. All IDs are strings. Timestamps are RFC 3339 UTC. Errors share one envelope:

json{ "error": { "code": "TIER_NOT_REACHED", "message": "Player is at tier 3, reward requires tier 5." } }

HTTP codes: 400 validation, 404 unknown player/season, 409 conflict (already claimed, duplicate event), 500 internal.

ingest-svc (HTTP, :8081)

POST /v1/events — submit a game event. The frontend's Event Console uses this.

Request:

json{
  "event_id": "b7e6a1f0-...-uuid",
  "player_id": "player-david",
  "type": "match_won",
  "occurred_at": "2026-07-02T18:04:11Z"
}

event_id is client-generated (UUID v4) and is the idempotency key. type is one of: match_won (+120 XP), match_played (+40), daily_login (+25), quest_completed (+200), first_win_of_day (+80). XP values live server-side in progression-svc; the client never sends XP amounts.

Responses:


202 Accepted → { "status": "queued", "event_id": "..." }
409 if event_id was already accepted → { "error": { "code": "DUPLICATE_EVENT", ... } } (optional; the consumer also dedupes)


pass-svc (gRPC :50051, HTTP gateway :8080)

GET /v1/season — active season with full tier ladder. Frontend loads this once at startup.

json{
  "season": {
    "id": "season-01",
    "name": "Night Line 01",
    "starts_at": "2026-07-01T00:00:00Z",
    "ends_at": "2026-08-31T23:59:59Z",
    "tier_count": 20
  },
  "tiers": [
    {
      "tier": 1,
      "xp_required": 100,
      "reward": { "id": "rw-001", "name": "Platform Badge", "kind": "badge", "icon": "badge" }
    },
    {
      "tier": 2,
      "xp_required": 250,
      "reward": { "id": "rw-002", "name": "Brass Token ×50", "kind": "currency", "icon": "token" }
    }
  ]
}

xp_required is cumulative. kind ∈ badge | currency | cosmetic | title. icon is a semantic key the frontend maps to its own icon set (badge, token, ticket, lamp, key, crown, flag, stamp).

GET /v1/players/{player_id}/progress — the hot path. Frontend polls this every 3 s.

json{
  "player_id": "player-david",
  "season_id": "season-01",
  "xp": 1340,
  "tier": 6,
  "next_tier": 7,
  "next_tier_xp": 1600,
  "tier_progress": 0.65,
  "claimed_tiers": [1, 2, 3, 5],
  "updated_at": "2026-07-02T18:04:12Z"
}

tier_progress is 0–1 within the current tier segment. next_tier and next_tier_xp are null at max tier. If the player has never sent an event, return this object with xp: 0, tier: 0 (do NOT 404 — the frontend treats tier 0 as "at the depot").

POST /v1/players/{player_id}/tiers/{tier}/claim — claim a tier's reward.


200 → { "claimed": { "tier": 5, "reward": { ... }, "claimed_at": "..." } }
409 ALREADY_CLAIMED, 409 TIER_NOT_REACHED


GET /v1/players/{player_id}/activity?limit=15 — recent processed events, newest first. Feeds the activity ticker.

json{
  "events": [
    { "type": "match_won", "xp_awarded": 120, "occurred_at": "...", "tier_after": 6, "unlocked_tier": null },
    { "type": "quest_completed", "xp_awarded": 200, "occurred_at": "...", "tier_after": 6, "unlocked_tier": 6 }
  ]
}

unlocked_tier is non-null only when that event caused a tier-up (frontend uses it to fire the tier-up animation).

GET /v1/leaderboard?limit=10 — from the Redis sorted set.

json{
  "entries": [
    { "rank": 1, "player_id": "player-mika", "display_name": "Mika", "xp": 4210, "tier": 14 }
  ],
  "player": { "rank": 23, "player_id": "player-david", "xp": 1340, "tier": 6 }
}

player echoes the requesting player's own rank when player_id query param is passed (?limit=10&player_id=player-david); otherwise omit it.

Frontend integration notes (for the AI agent)


Base URLs come from two constants at the top of the app: INGEST_URL (default http://localhost:8081) and API_URL (default http://localhost:8080).
Mock mode: a single boolean MOCK = true at the top of the code. When true, all fetches are replaced by an in-memory mock implementing the exact schemas above (including XP math, tier-ups, claims, dedupe). Build against mocks first; the backend swaps in by flipping the flag. The mock must simulate ~400 ms latency and a 5% random failure rate so loading and error states are real.
Identity is fake: a hardcoded PLAYER_ID = "player-david" constant. No auth anywhere.
Poll /progress every 3 s while the tab is visible; pause on document.hidden. After the Event Console fires an event, poll immediately, then at 1 s intervals for 5 s (events are async through RabbitMQ; the UI should visibly "catch" the XP landing).



Part 2 — Frontend Design Spec

Concept

Terminus — a battle pass styled as a European night-train departure hall. Not retro-pixel gaming, not neon cyberpunk, not a glassy dashboard. The references are: split-flap departure boards, enamel platform signage, metro line diagrams, punched paper tickets. The interface should feel like standing in a beautiful old station at night: dark, warm-lit, typographic, mechanical.

Single-page app, desktop-first, responsive down to 380 px. Plain React or vanilla HTML/CSS/JS — no component libraries, no Tailwind, no CSS frameworks. Hand-written CSS with the tokens below.

Tokens

Colors (define as CSS custom properties, use nothing outside this set):

TokenHexUse--night#131A26page background (deep blue-charcoal, NOT pure black)--night-2#1C2534raised panels, cards--night-3#263144borders, dividers, inset wells--bone#E8E3D5primary text, signage lettering--bone-dim#9AA0A8secondary text, labels--signal#F5B921THE accent: XP, active line, claimable state, focus rings--vermilion#D9482Bdestructive/error, the "you are here" train marker, stamp ink--verdigris#3E8E7Esuccess, claimed state, "departed" stations

Rules: --signal yellow is the only attention color; never use it for more than ~10% of any viewport. No gradients anywhere except one (specified in the Line section). No glassmorphism, no blur, no drop shadows softer than 0 2px 0 rgba(0,0,0,.35) — shadows in this world are hard-edged and mechanical. Corner radius: 2px on everything (--radius: 2px); the only exceptions are station dots and the train marker, which are circles.

Typography (Google Fonts):

RoleFaceNotesDisplay / signageOverpass, weights 700 + 900Derived from US Highway Gothic — reads as real transit signage. Use for headings, tier numbers, buttons. Headings are UPPERCASE with letter-spacing: 0.08em.BodyPublic Sans, 400 + 600Quiet, governmental. Sentence case.Data / numeralsIBM Plex Mono, 500ALL numbers in the UI (XP, ranks, countdowns, timestamps) render in Plex Mono, tabular. Numbers are the soul of this design — never render a number in the body face.

Type scale: 12 / 14 / 16 / 20 / 28 / 44 px. The 44 px size is reserved for the split-flap XP counter only.

Spacing: 8 px base grid. Panel padding 24 px. Max content width 1200 px, centered.

Texture: the page background gets one subtle detail — a 1 px dotted vertical rule down the far left and right margins (like ticket perforation), color --night-3. Nothing else. No noise overlays, no grain.

Layout

┌────────────────────────────────────────────────────────┐
│ HEADER: NIGHT LINE 01          DEPARTS IN 60d 05h 12m  │
├────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────┐ ┌───────────────────┐ │
│ │  PASSENGER CARD              │ │  LEADERBOARD      │ │
│ │  split-flap XP · tier badge  │ │  (station board)  │ │
│ └──────────────────────────────┘ └───────────────────┘ │
├────────────────────────────────────────────────────────┤
│  THE LINE  (full-width horizontal tier track)           │
│  ●───●───●───◉───○───○───○ ...  [scrolls horizontally]  │
├────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────┐ ┌───────────────────┐ │
│ │  EVENT CONSOLE (dev tools)   │ │  ACTIVITY LOG     │ │
│ └──────────────────────────────┘ └───────────────────┘ │
└────────────────────────────────────────────────────────┘

Below 900 px, panels stack in this order: Passenger Card → The Line → Event Console → Activity → Leaderboard.

Components

1. Header. Left: season name in Overpass 900, 28 px, uppercase, --bone, with a small --signal square (12×12 px) before it like a line-color chip on a metro map. Right: DEPARTS IN 60d 05h 12m — the label in --bone-dim 12 px uppercase, the countdown in Plex Mono --bone, ticking live every second. Header has a 2 px solid --signal bottom border; this is the only place besides The Line that yellow appears as a line.

2. Passenger Card (the hero). A panel styled like a large paper ticket rendered in the dark palette: --night-2 background, 1 px --night-3 border, and a real punched notch (two half-circle cutouts, --night colored, absolutely positioned on the left and right edges at 50% height, 20 px diameter) with a 1 px dashed --night-3 vertical rule connecting them. Contents, left to right:


Eyebrow PASSENGER (12 px, uppercase, --bone-dim), then PLAYER-DAVID in Overpass 700, 20 px.
The split-flap XP counter — the signature element, spec'd below. 44 px Plex Mono digits.
Tier plaque: a 64×64 px square, 2 px --bone border, tier number in Overpass 900 at 28 px, with TIER in 10 px above it — styled like an enamel platform number sign.
A thin horizontal progress bar (6 px tall, --night-3 track, --signal fill, square ends) with Plex Mono caption below: 1340 / 1600 XP · NEXT STOP: TIER 7.


3. Split-flap counter (signature element). The XP total renders as 5 individual digit cards, each 40×56 px, --night-3 background, 2 px radius, with a 1 px horizontal seam line across the middle (pseudo-element, rgba(0,0,0,.5)). When the value changes, each changed digit animates: the card's top half rotates down over 300 ms (transform: rotateX, perspective: 300px, easing cubic-bezier(.4,0,.6,1)), digits cascade through intermediate values (roll through at most 4 intermediates), right-most digit first, 60 ms stagger. A soft mechanical tick is NOT needed — no audio. If prefers-reduced-motion, digits swap instantly with a 150 ms opacity crossfade.

4. The Line (second signature moment, but quieter). A full-width horizontal band, 160 px tall, --night background, horizontally scrollable (scroll-snap on stations, drag-to-scroll on desktop, native touch scroll on mobile; auto-scroll so the current tier sits at ~40% viewport width on load). Across its vertical center runs the route: a 4 px line. Behind the player: solid --signal. Ahead: dashed --night-3. The single allowed gradient: the last 80 px of the yellow segment fades from --signal into the dashed section.

Each tier is a station: a 16 px circle on the line + label group below (tier number in Plex Mono 14 px, reward name in Public Sans 12 px --bone-dim, reward icon 20 px above the dot). Station states:


Departed & claimed: --verdigris filled dot; below the label, a small rubber-stamp mark — the word CLAIMED in 10 px uppercase inside a 1 px --verdigris border, rotated −6°, opacity .85, like an ink stamp.
Reached, unclaimed: --signal filled dot with a 4 px yellow glow ring pulsing at 2 s intervals (scale 1→1.3, fade out); a small CLAIM button under it (spec below). This is the only pulsing element on the page.
Locked: hollow dot, 2 px --night-3 border; label at 50% opacity.
Every 5th tier is a major station: 24 px dot, reward name in Overpass 700 14 px --bone.


The player position: a --vermilion circle, 12 px, riding ON the line at the exact XP-interpolated position between stations, with a tiny YOU label in 10 px Plex Mono vermilion above it. When XP lands, it slides to its new position over 800 ms ease-out — this is the payoff moment of the whole UI: fire event → watch the red marker travel.

5. Buttons. One style: Overpass 700, 14 px, uppercase, letter-spacing .06em, 10 px × 18 px padding, 2 px radius. Primary (CLAIM): --signal background, --night text, and a hard 3 px shadow (box-shadow: 0 3px 0 #B8880F) that compresses on press (translateY(2px), shadow to 1 px) — mechanical, like a ticket-machine button. Secondary (Event Console): transparent, 1 px --bone-dim border, --bone text; border and text go --signal on hover. Disabled: 40% opacity, no shadow. Focus-visible: 2 px --signal outline, 2 px offset, everywhere.

6. Event Console. Titled DISPATCH · DEV CONSOLE, subtitle in --bone-dim 12 px: "Simulate game events. In production these arrive from game servers." Five secondary buttons in a wrap row, each with its XP value in Plex Mono: MATCH WON +120 / MATCH PLAYED +40 / DAILY LOGIN +25 / QUEST COMPLETE +200 / FIRST WIN +80. On click: button enters a brief busy state (opacity .6, not a spinner), POSTs to /v1/events with a fresh UUID, then the fast-poll kicks in. On success, no toast — the split-flap and the red marker moving ARE the feedback. On failure, an inline error line under the buttons in --vermilion Plex Mono 12 px: DISPATCH FAILED — SIGNAL LOST. RETRY. which clears on next attempt.

7. Activity Log. Titled ARRIVALS. A list of rows from /activity, newest on top, each: time 18:04 (Plex Mono, --bone-dim) · event name in Public Sans (Match won) · +120 XP right-aligned in Plex Mono --signal. Rows separated by 1 px --night-3 rules. A row whose unlocked_tier is non-null gets a full-width --verdigris sub-line: — ARRIVED AT TIER 6 — centered, 11 px, letter-spaced. New rows enter with a 200 ms slide-down. Empty state: NO ARRIVALS YET. DISPATCH AN EVENT TO DEPART. centered, --bone-dim.

8. Leaderboard. Titled STANDINGS. Ten rows: rank in Plex Mono (01–10, zero-padded), name, tier plaque miniature (20 px square, 1 px border, tier number), XP right-aligned Plex Mono. Rank 1's rank number is --signal. If the API returns the player self-entry and it's outside top 10, append a separated row (1 px dashed --night-3 above): 23 · PLAYER-DAVID · 1340 with the whole row in --signal.

9. Tier-up moment. When a poll detects tier increased: the newly reached station's dot scales 1→1.6→1 (500 ms), its CLAIM button drops in from −8 px with the mechanical shadow bounce, and the Line auto-scrolls to center it. No confetti, no modal, no full-screen flash — the restraint is the personality. prefers-reduced-motion: all movement replaced by opacity fades ≤150 ms; the red marker jumps instead of sliding.

10. Loading & errors. Initial load: panels render immediately with Plex Mono placeholder dashes (— — —) where data goes — like a departure board before it flips on. No skeleton shimmer, no spinners anywhere. If /season fails: full-page centered message, Overpass 700: SERVICE SUSPENDED with body text The line is not responding. Check that pass-svc is running on :8080. and a secondary RETRY button.

Copy voice

Everything in the station's voice: short, operational, uppercase for signage, sentence case for body. Never "Oops!", never exclamation marks, never emoji. Claim confirmations are stamps, not toasts. The countdown label is DEPARTS IN, the season end state is LAST SERVICE — SEASON ENDED.

Hard don'ts (anti-AI-clone list)

No purple/indigo-to-pink gradients. No glassmorphism or backdrop-filter. No rounded-2xl cards. No emoji as icons (icons are inline SVG, 1.5 px stroke, drawn in --bone). No Inter/Roboto/Poppins. No confetti libraries. No floating blobs. No dark-mode-toggle. No hero with a big number + small label + gradient accent. Exactly one pulsing element (the claimable station), exactly one gradient (the Line fade).

Definition of done

Runs from a single index.html (or one-file React) with MOCK = true; flipping to false and starting the Go services makes it live with zero code changes. Responsive at 380 / 768 / 1200 px. Keyboard: every button reachable, focus visible. Lighthouse accessibility ≥ 90.

Based on the explanation, make the design for this so I can later send it to another AI to implement it in react.

## Assistant

_[tool: set_project_title]_

_[tool: update_todos]_

_[tool: dc_write]_

_[tool: ready_for_verification]_

Built **Terminus.dc.html** — the full battle pass UI running on the in-memory mock (400 ms latency, 5% failure, exact API schemas from the spec):

- Passenger ticket card with split-flap XP counter, enamel tier plaque, progress bar
- The Line: scrollable 20-station route, yellow/dashed segments with the single gradient fade, red YOU marker that slides on XP landing, claim/claimed/locked station states, tier-up pop + auto-scroll
- Dispatch console (fires events → fast-poll → watch XP land), Arrivals log, Standings with self-row, live countdown
- Reduced-motion fallbacks, focus rings, mechanical button shadows

Tweaks: season name, starting XP, mock failure rate. Try dispatching a few events — the flap cascade and marker travel are the payoff. Flip `MOCK` in the logic when handing to the implementing AI.

## User

Found issues — fixing…

## Assistant

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Fixed — the Line now waits for layout before auto-scrolling, so the red YOU marker lands at ~40% of the viewport on load instead of being clipped off-edge.

