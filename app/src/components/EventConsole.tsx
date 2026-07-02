import type { EventType } from '../api';

const BUTTONS: Array<[EventType, string, string]> = [
  ['match_won', 'Match Won', '+120'],
  ['match_played', 'Match Played', '+40'],
  ['daily_login', 'Daily Login', '+25'],
  ['quest_completed', 'Quest Complete', '+200'],
  ['first_win_of_day', 'First Win', '+80'],
];

interface EventConsoleProps {
  busy: EventType | null;
  error: boolean;
  onDispatch: (type: EventType) => void;
}

export function EventConsole({ busy, error, onDispatch }: EventConsoleProps) {
  return (
    <section className="panel panel-console" aria-label="Dispatch — dev console">
      <div className="panel-title">Dispatch · Dev Console</div>
      <div className="console-subtitle">
        Simulate game events. In production these arrive from game servers.
      </div>
      <div className="console-buttons">
        {BUTTONS.map(([type, label, xp]) => (
          <button
            key={type}
            className={`btn btn-secondary${busy === type ? ' busy' : ''}`}
            onClick={() => onDispatch(type)}
          >
            <span>{label}</span>
            <span className="btn-xp">{xp}</span>
          </button>
        ))}
      </div>
      {error && <div className="dispatch-error">DISPATCH FAILED — SIGNAL LOST. RETRY.</div>}
    </section>
  );
}
