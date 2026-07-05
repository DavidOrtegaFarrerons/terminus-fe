import { Fragment } from 'react';
import type { ActivityEvent } from '../api';

const EVENT_NAMES: Record<string, string> = {
  match_won: 'Match won',
  match_played: 'Match played',
  daily_login: 'Daily login',
  quest_completed: 'Quest completed',
  first_win_of_day: 'First win of day',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function ActivityLog({ events }: { events: ActivityEvent[] | null }) {
  return (
    <section className="panel panel-activity" aria-label="Arrivals">
      <div className="panel-title spaced">Arrivals</div>
      {!events && <div className="placeholder-dashes">— — —</div>}
      {events && events.length === 0 && (
        <div className="activity-empty">NO ARRIVALS YET. DISPATCH AN EVENT TO DEPART.</div>
      )}
      {events?.map((ev, i) => (
        <Fragment key={`${ev.occurred_at}:${ev.type}:${ev.xp_awarded}`}>
          <div className={`activity-row${i === 0 ? ' first entering' : ''}`}>
            <div className="activity-main">
              <div className="activity-time">{formatTime(ev.occurred_at)}</div>
              <div className="activity-name">{EVENT_NAMES[ev.type] ?? ev.type}</div>
              <div className="activity-xp">+{ev.xp_awarded} XP</div>
            </div>
          </div>
          {ev.unlocked_tier !== null && (
            <div className="activity-tierup">
              ARRIVED AT TIER {ev.unlocked_tier}
            </div>
          )}
        </Fragment>
      ))}
    </section>
  );
}
