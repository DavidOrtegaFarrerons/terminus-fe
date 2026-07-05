import type { Progress, Season } from '../api';
import { SplitFlap } from './SplitFlap';

const fmt = (n: number) => n.toLocaleString('en-US');

function formatValidUntil(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '— — —';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

interface PassengerCardProps {
  progress: Progress | null;
  season: Season | null;
}

export function PassengerCard({ progress, season }: PassengerCardProps) {
  const caption = !progress
    ? '— — — / — — — XP'
    : progress.next_tier_xp === null
      ? `${fmt(progress.xp)} XP · TERMINUS REACHED`
      : `${fmt(progress.xp)} / ${fmt(progress.next_tier_xp)} XP · NEXT STOP: TIER ${progress.next_tier}`;

  const pct = progress
    ? Math.round(Math.max(0, Math.min(1, progress.tier_progress)) * 100)
    : 0;

  const totalTiers = season?.tier_count ?? 20;
  const claimedCount = progress?.claimed_tiers.length ?? 0;
  const route = season ? season.id.toUpperCase() : '— — —';
  const validUntil = season ? formatValidUntil(season.ends_at) : '— — —';

  return (
    <section className="panel ticket panel-passenger" aria-label="Passenger card">
      <div className="ticket-notch left" />
      <div className="ticket-notch right" />
      <div className="ticket-rule" />
      <div className="ticket-top">
        <div className="passenger-block">
          <div className="eyebrow">Passenger</div>
          <div className="passenger-name-wrap">
            <div className="passenger-name">Player-David</div>
          </div>
        </div>
        <div className="xp-block">
          <div className="eyebrow">Total XP</div>
          <SplitFlap xp={progress ? progress.xp : null} />
        </div>
        <div className="tier-block">
          <div className="eyebrow">Tier</div>
          <div className="tier-plaque">
            <div className="tier-plaque-num">{progress ? progress.tier : '—'}</div>
          </div>
        </div>
      </div>
      <div className="ticket-bottom">
        <div className="ticket-progress">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="progress-caption" aria-live="polite">{caption}</div>
          <div className="ticket-stub">
            <div className="stub-cell">
              <div className="stub-label">Route</div>
              <div className="stub-value">{route}</div>
            </div>
            <div className="stub-cell">
              <div className="stub-label">Rewards Claimed</div>
              <div className="stub-value" aria-live="polite">
                {claimedCount} / {totalTiers}
              </div>
            </div>
            <div className="stub-cell right">
              <div className="stub-label">Valid Until</div>
              <div className="stub-value">{validUntil}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
