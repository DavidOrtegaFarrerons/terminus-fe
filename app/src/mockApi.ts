// In-memory mock backend. Enabled with VITE_MOCK=true.
// Behaviour mirrors the mock in the original design handoff so demos feel
// realistic — accelerating XP curve, 400 ms latency, 5% failure rate, and an
// asynchronous XP lag between event ingest and progress landing.
import { ApiError } from './api';
import type {
  ActivityEvent,
  ClaimResponse,
  EventType,
  Leaderboard,
  Progress,
  RewardIcon,
  RewardKind,
  Season,
  SeasonResponse,
  Tier,
} from './api';
import { MOCK_FAILURE_RATE, MOCK_START_XP, PLAYER_ID } from './config';

const now = () => new Date().toISOString();
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const LATENCY_MS = 400;
const EVENT_LAG_MS = 700;

const SEASON: Season = {
  id: 'season-01',
  name: 'Night Line 01',
  starts_at: '2026-07-01T00:00:00Z',
  ends_at: '2026-08-31T23:59:59Z',
  tier_count: 20,
};

const LADDER: number[] = [
  100, 250, 450, 700, 1000, 1300, 1600, 2000, 2450, 2950,
  3500, 4100, 4750, 5450, 6200, 7000, 7850, 8750, 9700, 10700,
];

const REWARD_TABLE: Array<[string, RewardKind, RewardIcon]> = [
  ['Platform Badge', 'badge', 'badge'],
  ['Brass Token ×50', 'currency', 'token'],
  ['Night Ticket', 'cosmetic', 'ticket'],
  ['Route Flag', 'cosmetic', 'flag'],
  ['Signal Lamp', 'cosmetic', 'lamp'],
  ['Ink Stamp', 'cosmetic', 'stamp'],
  ['Brass Token ×100', 'currency', 'token'],
  ['Porter Badge', 'badge', 'badge'],
  ['Transfer Ticket', 'cosmetic', 'ticket'],
  ['Cabin Key', 'cosmetic', 'key'],
  ['Brass Token ×150', 'currency', 'token'],
  ['Line Flag', 'cosmetic', 'flag'],
  ['Gauge Badge', 'badge', 'badge'],
  ['Sleeper Ticket', 'cosmetic', 'ticket'],
  ['“Conductor” Title', 'title', 'crown'],
  ['Brass Token ×200', 'currency', 'token'],
  ['Signal Stamp', 'cosmetic', 'stamp'],
  ['Watch Lantern', 'cosmetic', 'lamp'],
  ['Express Ticket', 'cosmetic', 'ticket'],
  ['Terminus Crown', 'title', 'crown'],
];

const TIERS: Tier[] = LADDER.map((xp_required, i) => {
  const [name, kind, icon] = REWARD_TABLE[i];
  return {
    tier: i + 1,
    xp_required,
    reward: { id: `rw-${String(i + 1).padStart(3, '0')}`, name, kind, icon },
  };
});

const XP_PER_EVENT: Record<EventType, number> = {
  match_won: 120,
  match_played: 40,
  daily_login: 25,
  quest_completed: 200,
  first_win_of_day: 80,
};

function tierForXp(currentXp: number): number {
  return LADDER.filter((r) => currentXp >= r).length;
}

function progressAt(currentXp: number) {
  const tier = tierForXp(currentXp);
  if (tier >= LADDER.length) {
    return { tier, next_tier: null, next_tier_xp: null, tier_progress: 1 };
  }
  const base = tier === 0 ? 0 : LADDER[tier - 1];
  const upper = LADDER[tier];
  return {
    tier,
    next_tier: tier + 1,
    next_tier_xp: upper,
    tier_progress: (currentXp - base) / (upper - base),
  };
}

// Seed the demo world so someone opening the app cold has something to look at.
const startXp = Math.max(0, MOCK_START_XP);
const startTier = tierForXp(startXp);
const state = {
  xp: startXp,
  claimedTiers: [1, 2, 3, 5].filter((t) => t <= startTier),
  activity: [] as ActivityEvent[],
};

const seedNow = Date.now();
const pushSeed = (
  minutesAgo: number,
  type: EventType,
  xp: number,
  unlocked: number | null,
) => {
  state.activity.push({
    type,
    xp_awarded: xp,
    occurred_at: new Date(seedNow - minutesAgo * 60000).toISOString(),
    tier_after: startTier,
    unlocked_tier: unlocked,
  });
};
pushSeed(9, 'match_won', 120, null);
pushSeed(14, 'quest_completed', 200, startTier > 0 ? startTier : null);
pushSeed(31, 'daily_login', 25, null);

async function withLatency<T>(fn: () => T): Promise<T> {
  await wait(LATENCY_MS);
  if (Math.random() < MOCK_FAILURE_RATE) {
    throw new ApiError('SIGNAL_LOST', 'mock: signal lost', 503);
  }
  return fn();
}

export function getSeason(): Promise<SeasonResponse> {
  return withLatency(() => ({ season: SEASON, tiers: TIERS }));
}

export function getProgress(): Promise<Progress> {
  return withLatency(() => {
    const p = progressAt(state.xp);
    return {
      player_id: PLAYER_ID,
      season_id: SEASON.id,
      xp: state.xp,
      tier: p.tier,
      next_tier: p.next_tier,
      next_tier_xp: p.next_tier_xp,
      tier_progress: p.tier_progress,
      claimed_tiers: [...state.claimedTiers].sort((a, b) => a - b),
      updated_at: now(),
    };
  });
}

export function getActivity(limit = 15): Promise<{ events: ActivityEvent[] }> {
  return withLatency(() => ({ events: state.activity.slice(0, limit) }));
}

export function getLeaderboard(_limit = 10): Promise<Leaderboard> {
  return withLatency(() => {
    const rows: Array<[string, number, number]> = [
      ['Mika', 4210, 14], ['Jonas', 3980, 13], ['Priya', 3610, 12],
      ['Ren', 3400, 11], ['Sofia', 3150, 11], ['Anouk', 2980, 10],
      ['Theo', 2710, 9], ['Lena', 2500, 9], ['Marco', 2260, 8], ['Ida', 2100, 8],
    ];
    const entries = rows.map(([name, xp, tier], i) => ({
      rank: i + 1,
      player_id: `player-${name.toLowerCase()}`,
      display_name: name,
      xp,
      tier,
    }));
    const player = {
      rank: 23,
      player_id: PLAYER_ID,
      xp: state.xp,
      tier: tierForXp(state.xp),
    };
    return { entries, player };
  });
}

export function postEvent(
  type: EventType,
  eventId: string,
): Promise<{ status: string; event_id: string }> {
  return withLatency(() => {
    // Real ingest is fire-and-forget over RabbitMQ. Simulate the consumer lag
    // so the fast-poll loop in App.tsx has something to catch up to.
    setTimeout(() => {
      const before = tierForXp(state.xp);
      state.xp += XP_PER_EVENT[type];
      const after = tierForXp(state.xp);
      state.activity.unshift({
        type,
        xp_awarded: XP_PER_EVENT[type],
        occurred_at: now(),
        tier_after: after,
        unlocked_tier: after > before ? after : null,
      });
    }, EVENT_LAG_MS);
    return { status: 'queued', event_id: eventId };
  });
}

export function claimTier(tier: number): Promise<ClaimResponse> {
  return withLatency(() => {
    if (state.claimedTiers.includes(tier)) {
      throw new ApiError('ALREADY_CLAIMED', 'tier already claimed', 409);
    }
    if (tier > tierForXp(state.xp)) {
      throw new ApiError('TIER_NOT_REACHED', `tier ${tier} not yet reached`, 409);
    }
    const t = TIERS.find((x) => x.tier === tier);
    if (!t) throw new ApiError('BAD_TIER', `unknown tier ${tier}`, 400);
    state.claimedTiers.push(tier);
    return { claimed: { tier, reward: t.reward, claimed_at: now() } };
  });
}
