// In-memory mock backend. Enabled with VITE_MOCK=true.
// State resets on page reload — this is a demo layer, not a persistent store.
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
import { PLAYER_ID } from './config';

const now = () => new Date().toISOString();
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SEASON: Season = {
  id: 'season-nightline-01',
  name: 'Night Line 01',
  starts_at: '2026-06-01T00:00:00Z',
  ends_at: '2026-09-01T00:00:00Z',
  tier_count: 20,
};

const ICONS: RewardIcon[] = ['badge', 'token', 'ticket', 'lamp', 'key', 'crown', 'flag', 'stamp'];
const KINDS: RewardKind[] = ['badge', 'currency', 'cosmetic', 'title'];
const REWARD_NAMES = [
  'Signal Flare', 'Line Token', 'Night Pass', 'Lamp of Ash',
  'Conductor Key', 'Crown of Coal', 'Terminus Flag', 'Passenger Stamp',
  'Long-Haul Badge', 'Ember Crown', 'Ash Ticket', 'Coal Badge',
  'Ironside Token', 'Ghostline Lamp', 'Bellwether Flag', 'Cinder Stamp',
  'Vanguard Key', 'Terminus Crown', 'Nightline Badge', 'Warden Token',
];

const TIERS: Tier[] = Array.from({ length: SEASON.tier_count }, (_, i) => {
  const tier = i + 1;
  return {
    tier,
    xp_required: tier * 500,
    reward: {
      id: `reward-${tier}`,
      name: REWARD_NAMES[i],
      kind: KINDS[i % KINDS.length],
      icon: ICONS[i % ICONS.length],
    },
  };
});

// Kept in sync with the badge labels in components/EventConsole.tsx.
const XP_PER_EVENT: Record<EventType, number> = {
  match_won: 120,
  match_played: 40,
  daily_login: 25,
  quest_completed: 200,
  first_win_of_day: 80,
};

let xp = 0;
const claimedTiers: number[] = [];
const activity: ActivityEvent[] = [];
const seenEventIds = new Set<string>();

function tierForXp(currentXp: number): number {
  let t = 0;
  for (const tier of TIERS) {
    if (currentXp >= tier.xp_required) t = tier.tier;
    else break;
  }
  return t;
}

function progressAt(currentXp: number) {
  const t = tierForXp(currentXp);
  if (t >= TIERS.length) {
    return { tier: t, next_tier: null, next_tier_xp: null, tier_progress: 1 };
  }
  const lowerXp = t === 0 ? 0 : TIERS[t - 1].xp_required;
  const upperXp = TIERS[t].xp_required;
  return {
    tier: t,
    next_tier: t + 1,
    next_tier_xp: upperXp,
    tier_progress: (currentXp - lowerXp) / (upperXp - lowerXp),
  };
}

export async function getSeason(): Promise<SeasonResponse> {
  await delay(80);
  return { season: SEASON, tiers: TIERS };
}

export async function getProgress(): Promise<Progress> {
  await delay(50);
  const p = progressAt(xp);
  return {
    player_id: PLAYER_ID,
    season_id: SEASON.id,
    xp,
    tier: p.tier,
    next_tier: p.next_tier,
    next_tier_xp: p.next_tier_xp,
    tier_progress: p.tier_progress,
    claimed_tiers: [...claimedTiers],
    updated_at: now(),
  };
}

export async function getActivity(limit = 15): Promise<{ events: ActivityEvent[] }> {
  await delay(60);
  return { events: activity.slice(0, limit) };
}

export async function getLeaderboard(limit = 10): Promise<Leaderboard> {
  await delay(70);
  const names = ['Ada', 'Kai', 'Rin', 'Mel', 'Zed', 'Ivy', 'Tom', 'Nia', 'Sol'];
  const others = names.map((name, i) => {
    const rankXp = Math.max(0, xp + 2500 - i * 400);
    return {
      rank: i + 1,
      player_id: `player-${i + 1}`,
      display_name: name,
      xp: rankXp,
      tier: tierForXp(rankXp),
    };
  });
  const player = {
    rank: others.length + 1,
    player_id: PLAYER_ID,
    display_name: 'David',
    xp,
    tier: tierForXp(xp),
  };
  return { entries: [...others, player].slice(0, limit), player };
}

export async function postEvent(
  type: EventType,
  eventId: string,
): Promise<{ status: string; event_id: string }> {
  await delay(120);
  if (seenEventIds.has(eventId)) {
    throw new ApiError('DUPLICATE_EVENT', 'event already ingested', 409);
  }
  seenEventIds.add(eventId);

  const prevTier = tierForXp(xp);
  const awarded = XP_PER_EVENT[type];
  xp += awarded;
  const newTier = tierForXp(xp);

  activity.unshift({
    type,
    xp_awarded: awarded,
    occurred_at: now(),
    tier_after: newTier,
    unlocked_tier: newTier > prevTier ? newTier : null,
  });

  return { status: 'accepted', event_id: eventId };
}

export async function claimTier(tier: number): Promise<ClaimResponse> {
  await delay(90);
  if (claimedTiers.includes(tier)) {
    throw new ApiError('ALREADY_CLAIMED', 'tier already claimed', 409);
  }
  const t = TIERS.find((x) => x.tier === tier);
  if (!t) throw new ApiError('BAD_TIER', `unknown tier ${tier}`, 400);
  if (tierForXp(xp) < tier) {
    throw new ApiError('TIER_LOCKED', `tier ${tier} not yet reached`, 409);
  }
  claimedTiers.push(tier);
  return { claimed: { tier, reward: t.reward, claimed_at: now() } };
}
