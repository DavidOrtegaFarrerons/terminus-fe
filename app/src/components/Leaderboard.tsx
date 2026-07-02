import type { Leaderboard as LeaderboardData } from '../api';

const fmt = (n: number) => n.toLocaleString('en-US');

export function Leaderboard({ data }: { data: LeaderboardData | null }) {
  const self = data?.player && data.player.rank > 10 ? data.player : null;

  return (
    <section className="panel panel-leaderboard" aria-label="Standings">
      <div className="panel-title spaced">Standings</div>
      {!data && <div className="placeholder-dashes">— — —</div>}
      {data?.entries.map((e) => (
        <div key={e.player_id} className="lb-row">
          <div className={`lb-rank${e.rank === 1 ? ' first' : ''}`}>
            {String(e.rank).padStart(2, '0')}
          </div>
          <div className="lb-name">{e.display_name ?? e.player_id}</div>
          <div className="lb-plaque">{e.tier}</div>
          <div className="lb-xp">{fmt(e.xp)}</div>
        </div>
      ))}
      {self && (
        <div className="lb-self">
          <div className="lb-rank">{self.rank}</div>
          <div className="lb-name">PLAYER-DAVID</div>
          <div className="lb-plaque">{self.tier}</div>
          <div className="lb-xp">{fmt(self.xp)}</div>
        </div>
      )}
    </section>
  );
}
