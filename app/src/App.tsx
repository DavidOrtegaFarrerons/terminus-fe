import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ApiError,
  claimTier,
  getActivity,
  getLeaderboard,
  getProgress,
  getSeason,
  postEvent,
  withRetry,
} from './api';
import type {
  ActivityEvent,
  EventType,
  Leaderboard as LeaderboardData,
  Progress,
  Season,
  Tier,
} from './api';
import { ActivityLog } from './components/ActivityLog';
import { EventConsole } from './components/EventConsole';
import { Header } from './components/Header';
import { Leaderboard } from './components/Leaderboard';
import { PassengerCard } from './components/PassengerCard';
import { TheLine } from './components/TheLine';

const POLL_MS = 3000;
const FAST_POLL_MS = 1000;
const FAST_POLL_COUNT = 5;
const TIER_UP_MS = 1200;

export default function App() {
  const [seasonError, setSeasonError] = useState(false);
  const [season, setSeason] = useState<Season | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[] | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [dispatchBusy, setDispatchBusy] = useState<EventType | null>(null);
  const [dispatchError, setDispatchError] = useState(false);
  const [claimBusy, setClaimBusy] = useState<number | null>(null);
  const [tierUpTier, setTierUpTier] = useState<number | null>(null);

  const lastXp = useRef<number | null>(null);
  const lastTier = useRef<number | null>(null);
  const fastTimer = useRef<number>();
  const tierUpTimer = useRef<number>();

  const refreshActivity = useCallback(async () => {
    try {
      const a = await getActivity();
      setActivity(a.events);
    } catch {
      // keep the previous list; the next XP change refreshes again
    }
  }, []);

  const refreshProgress = useCallback(async () => {
    let p: Progress;
    try {
      p = await getProgress();
    } catch {
      return; // poll again later
    }
    const prevXp = lastXp.current;
    const prevTier = lastTier.current;
    lastXp.current = p.xp;
    lastTier.current = p.tier;
    setProgress(p);
    if (prevXp !== null && p.xp !== prevXp) refreshActivity();
    if (prevTier !== null && p.tier > prevTier) {
      setTierUpTier(p.tier);
      window.clearTimeout(tierUpTimer.current);
      tierUpTimer.current = window.setTimeout(() => setTierUpTier(null), TIER_UP_MS);
    }
  }, [refreshActivity]);

  const loadAll = useCallback(async () => {
    setSeasonError(false);
    try {
      const s = await withRetry(getSeason, 3);
      setSeason(s.season);
      setTiers(s.tiers);
    } catch {
      setSeasonError(true);
      return;
    }
    refreshProgress();
    refreshActivity();
    withRetry(getLeaderboard, 3).then(setLeaderboard).catch(() => {});
  }, [refreshProgress, refreshActivity]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Poll /progress every 3 s while the tab is visible.
  useEffect(() => {
    const t = window.setInterval(() => {
      if (!document.hidden) refreshProgress();
    }, POLL_MS);
    return () => window.clearInterval(t);
  }, [refreshProgress]);

  useEffect(
    () => () => {
      window.clearInterval(fastTimer.current);
      window.clearTimeout(tierUpTimer.current);
    },
    []
  );

  // Events land asynchronously via RabbitMQ: poll immediately after a
  // dispatch, then at 1 s intervals for 5 s so the UI catches the XP landing.
  const fastPoll = useCallback(() => {
    window.clearInterval(fastTimer.current);
    refreshProgress();
    let n = 0;
    fastTimer.current = window.setInterval(() => {
      refreshProgress();
      if (++n >= FAST_POLL_COUNT) window.clearInterval(fastTimer.current);
    }, FAST_POLL_MS);
  }, [refreshProgress]);

  const dispatch = async (type: EventType) => {
    if (dispatchBusy) return;
    setDispatchBusy(type);
    setDispatchError(false);
    try {
      await postEvent(type);
      fastPoll();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'DUPLICATE_EVENT') fastPoll();
      else setDispatchError(true);
    } finally {
      setDispatchBusy(null);
    }
  };

  const markClaimed = (tier: number) =>
    setProgress((p) =>
      p && !p.claimed_tiers.includes(tier)
        ? { ...p, claimed_tiers: [...p.claimed_tiers, tier].sort((a, b) => a - b) }
        : p
    );

  const claim = async (tier: number) => {
    if (claimBusy !== null) return;
    setClaimBusy(tier);
    try {
      await claimTier(tier);
      markClaimed(tier);
    } catch (e) {
      // ALREADY_CLAIMED means our view is stale — sync it; anything else
      // reconciles on the next progress poll
      if (e instanceof ApiError && e.code === 'ALREADY_CLAIMED') markClaimed(tier);
    } finally {
      setClaimBusy(null);
    }
  };

  if (seasonError) {
    return (
      <div className="suspended">
        <div className="suspended-title">Service Suspended</div>
        <div className="suspended-body">
          The line is not responding. Check that pass-svc is running on :8080.
        </div>
        <button className="btn btn-secondary" onClick={loadAll}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="perforation-left" />
      <div className="perforation-right" />
      <div className="container">
        <Header
          seasonName={season?.name ?? null}
          endsAt={season ? Date.parse(season.ends_at) : null}
        />
        <div className="panels">
          <div className="panel-row">
            <PassengerCard progress={progress} />
            <Leaderboard data={leaderboard} />
          </div>
          <TheLine
            tiers={tiers}
            progress={progress}
            tierUpTier={tierUpTier}
            claimBusy={claimBusy}
            onClaim={claim}
          />
          <div className="panel-row">
            <EventConsole busy={dispatchBusy} error={dispatchError} onDispatch={dispatch} />
            <ActivityLog events={activity} />
          </div>
        </div>
      </div>
    </div>
  );
}
