import type { Progress } from '../api';
import { SplitFlap } from './SplitFlap';

const fmt = (n: number) => n.toLocaleString('en-US');

export function PassengerCard({ progress }: { progress: Progress | null }) {
  const caption = !progress
    ? '— — — / — — — XP'
    : progress.next_tier_xp === null
      ? `${fmt(progress.xp)} XP · TERMINUS REACHED`
      : `${fmt(progress.xp)} / ${fmt(progress.next_tier_xp)} XP · NEXT STOP: TIER ${progress.next_tier}`;

  const pct = progress
    ? Math.round(Math.max(0, Math.min(1, progress.tier_progress)) * 100)
    : 0;

  return (
    <section className="panel ticket panel-passenger" aria-label="Passenger card">
      <div className="ticket-notch left" />
      <div className="ticket-notch right" />
      <div className="ticket-rule" />
      <div className="ticket-top">
        <div className="passenger-block">
          <div className="eyebrow">Passenger</div>
          <div className="passenger-name">Player-David</div>
        </div>
        <div className="xp-block">
          <div className="eyebrow">Total XP</div>
          <SplitFlap xp={progress ? progress.xp : null} />
        </div>
        <div className="tier-plaque">
          <div className="tier-plaque-label">Tier</div>
          <div className="tier-plaque-num">{progress ? progress.tier : '—'}</div>
        </div>
      </div>
      <div className="ticket-progress">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="progress-caption" aria-live="polite">{caption}</div>
      </div>
    </section>
  );
}
