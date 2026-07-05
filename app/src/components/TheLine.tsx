import { useEffect, useRef } from 'react';
import type { Progress, Tier } from '../api';
import { RewardGlyph } from '../icons';
import { prefersReducedMotion } from '../reducedMotion';

const STATION_SPACING = 140;
const FIRST_STATION_X = 70;
const TIER_COUNT = 20;
const FADE_WIDTH = 80;

export function stationX(tier: number): number {
  return FIRST_STATION_X + tier * STATION_SPACING;
}

function markerXFor(tier: number, prog: number): number {
  const a = stationX(tier);
  const b = tier >= TIER_COUNT ? a : stationX(tier + 1);
  return a + (b - a) * Math.max(0, Math.min(1, prog || 0));
}

interface TheLineProps {
  tiers: Tier[];
  progress: Progress | null;
  tierUpTier: number | null;
  claimBusy: number | null;
  onClaim: (tier: number) => void;
}

export function TheLine({ tiers, progress, tierUpTier, claimBusy, onClaim }: TheLineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const didInitialScroll = useRef(false);

  const depotX = stationX(0);
  const terminusX = stationX(TIER_COUNT);
  const trackSpan = terminusX - depotX;

  const markerX = progress ? markerXFor(progress.tier, progress.tier_progress) : depotX;
  const clampedMarkerX = Math.min(Math.max(markerX, depotX), terminusX);
  const behindWidth = Math.max(0, clampedMarkerX - depotX - FADE_WIDTH);
  const lineWidth = terminusX + 90;

  const scrollTo = (x: number, smooth: boolean, attempt = 0) => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) {
      if (attempt < 30) requestAnimationFrame(() => scrollTo(x, smooth, attempt + 1));
      return;
    }
    const left = Math.max(0, x - el.clientWidth * 0.4);
    if (smooth && !prefersReducedMotion()) el.scrollTo({ left, behavior: 'smooth' });
    else el.scrollLeft = left;
  };

  useEffect(() => {
    if (!progress || didInitialScroll.current) return;
    didInitialScroll.current = true;
    scrollTo(markerXFor(progress.tier, progress.tier_progress), false);
  }, [progress]);

  useEffect(() => {
    if (tierUpTier !== null) scrollTo(stationX(tierUpTier), true);
  }, [tierUpTier]);

  const onMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el || e.button !== 0) return;
    const startX = e.clientX;
    const startLeft = el.scrollLeft;
    const move = (ev: MouseEvent) => {
      el.scrollLeft = startLeft - (ev.clientX - startX);
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  // Map vertical mouse-wheel to horizontal scroll on the track.
  const onWheel = (e: React.WheelEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
    }
  };

  const currentTier = progress?.tier ?? -1;
  const claimedTiers = progress?.claimed_tiers ?? [];
  const highestClaimable = progress
    ? Math.max(
        0,
        ...Array.from({ length: progress.tier }, (_, i) => i + 1).filter(
          (t) => !claimedTiers.includes(t)
        )
      )
    : 0;

  return (
    <section className="panel-line" aria-label="The Line — season route">
      <div className="line-title">
        The Line <span className="dim">· Season Route</span>
      </div>
      <div
        ref={scrollRef}
        className="line-scroll"
        onMouseDown={onMouseDown}
        onWheel={onWheel}
      >
        <div className="line-canvas" style={{ width: lineWidth }}>
          <div
            className="track-ahead"
            style={{ left: depotX, width: trackSpan }}
          />
          <div
            className="track-solid"
            style={{ left: depotX, width: behindWidth }}
          />
          <div className="track-fade" style={{ left: depotX + behindWidth }} />

          {tiers.length > 0 &&
            Array.from({ length: TIER_COUNT + 1 }, (_, t) => {
              const info = t === 0 ? null : tiers[t - 1];
              const major = t > 0 && t % 5 === 0;
              const reached = progress !== null && t <= currentTier;
              const claimed = t > 0 && claimedTiers.includes(t);
              const claimable = t > 0 && reached && !claimed;
              const locked = t > 0 && !reached;
              const size = major ? 24 : 16;
              return (
                <div key={t} className="station" style={{ left: stationX(t) - 70 }}>
                  {info && (
                    <div className="station-icon">
                      <RewardGlyph icon={info.reward.icon} />
                    </div>
                  )}
                  {claimable && t === highestClaimable && (
                    <div className="station-ring" style={{ width: size + 8, height: size + 8 }} />
                  )}
                  <div
                    className={`station-dot${tierUpTier === t ? ' pop' : ''}`}
                    style={{
                      width: size,
                      height: size,
                      background: claimed
                        ? 'var(--verdigris)'
                        : reached
                          ? 'var(--signal)'
                          : 'var(--night)',
                      border: reached || claimed ? 'none' : '2px solid var(--night-3)',
                    }}
                  />
                  <div className={`station-label${locked ? ' locked' : ''}`}>
                    <div className="station-num">{t === 0 ? 'D' : String(t).padStart(2, '0')}</div>
                    <div className={`station-name${major ? ' major' : ''}`}>
                      {info ? info.reward.name : 'Depot'}
                    </div>
                    {claimed && <div className="stamp">Claimed</div>}
                    {claimable && (
                      <button
                        className={`btn btn-primary btn-claim${claimBusy === t ? ' busy' : ''}`}
                        onClick={() => onClaim(t)}
                      >
                        Claim
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

          <div className="marker-label" style={{ left: markerX }}>
            YOU
          </div>
          <div className="marker-dot" style={{ left: markerX }} />
        </div>
      </div>
    </section>
  );
}
