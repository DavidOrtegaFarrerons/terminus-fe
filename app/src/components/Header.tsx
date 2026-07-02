import { useEffect, useState } from 'react';

function formatCountdown(ms: number): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const d = Math.floor(ms / 86400000);
  const h = Math.floor(ms / 3600000) % 24;
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  return `${d}d ${p(h)}h ${p(m)}m ${p(s)}s`;
}

export function Header({ seasonName, endsAt }: { seasonName: string | null; endsAt: number | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const ended = endsAt !== null && endsAt - now <= 0;

  return (
    <header className="header">
      <div className="header-brand">
        <div className="line-chip" />
        <h1 className="season-name">{seasonName ?? '— — —'}</h1>
      </div>
      <div className="countdown-block">
        <div className="countdown-label">{ended ? 'Last Service' : 'Departs In'}</div>
        <div className="countdown-value">
          {endsAt === null ? '— — — —' : ended ? 'SEASON ENDED' : formatCountdown(endsAt - now)}
        </div>
      </div>
    </header>
  );
}
