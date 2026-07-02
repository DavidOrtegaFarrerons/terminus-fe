import { API_URL, INGEST_URL, PLAYER_ID } from './config';

// ── Schemas (exact shapes from the API spec) ──

export type RewardKind = 'badge' | 'currency' | 'cosmetic' | 'title';
export type RewardIcon =
  | 'badge' | 'token' | 'ticket' | 'lamp' | 'key' | 'crown' | 'flag' | 'stamp';

export interface Reward {
  id: string;
  name: string;
  kind: RewardKind;
  icon: RewardIcon;
}

export interface Tier {
  tier: number;
  xp_required: number;
  reward: Reward;
}

export interface Season {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  tier_count: number;
}

export interface SeasonResponse {
  season: Season;
  tiers: Tier[];
}

export interface Progress {
  player_id: string;
  season_id: string;
  xp: number;
  tier: number;
  next_tier: number | null;
  next_tier_xp: number | null;
  tier_progress: number;
  claimed_tiers: number[];
  updated_at: string;
}

export type EventType =
  | 'match_won' | 'match_played' | 'daily_login' | 'quest_completed' | 'first_win_of_day';

export interface ActivityEvent {
  type: EventType;
  xp_awarded: number;
  occurred_at: string;
  tier_after: number;
  unlocked_tier: number | null;
}

export interface LeaderboardEntry {
  rank: number;
  player_id: string;
  display_name?: string;
  xp: number;
  tier: number;
}

export interface Leaderboard {
  entries: LeaderboardEntry[];
  player?: LeaderboardEntry;
}

export interface ClaimResponse {
  claimed: { tier: number; reward: Reward; claimed_at: string };
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// ── Transport ──
// Errors share one envelope: { "error": { "code": "...", "message": "..." } }

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let code = `HTTP_${res.status}`;
    let message = res.statusText;
    try {
      const body = await res.json();
      if (body?.error) {
        code = body.error.code ?? code;
        message = body.error.message ?? message;
      }
    } catch {
      // non-JSON error body — keep HTTP status code
    }
    throw new ApiError(code, message, res.status);
  }
  return res.json() as Promise<T>;
}

function post<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function withRetry<T>(fn: () => Promise<T>, n: number): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < n; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

// ── Endpoints ──

export function getSeason(): Promise<SeasonResponse> {
  return request(`${API_URL}/v1/season`);
}

export function getProgress(): Promise<Progress> {
  return request(`${API_URL}/v1/players/${PLAYER_ID}/progress`);
}

export function getActivity(limit = 15): Promise<{ events: ActivityEvent[] }> {
  return request(`${API_URL}/v1/players/${PLAYER_ID}/activity?limit=${limit}`);
}

export function getLeaderboard(limit = 10): Promise<Leaderboard> {
  return request(`${API_URL}/v1/leaderboard?limit=${limit}&player_id=${PLAYER_ID}`);
}

export function postEvent(type: EventType): Promise<{ status: string; event_id: string }> {
  return post(`${INGEST_URL}/v1/events`, {
    event_id: crypto.randomUUID(),
    player_id: PLAYER_ID,
    type,
    occurred_at: new Date().toISOString(),
  });
}

export function claimTier(tier: number): Promise<ClaimResponse> {
  return post(`${API_URL}/v1/players/${PLAYER_ID}/tiers/${tier}/claim`, {});
}
