import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../reducedMotion';

interface Digit {
  c: string;
  k: number; // bumped on every flip so the CSS animation retriggers via key change
}

const DIGITS = 5;

function format(xp: number): string[] {
  return String(Math.max(0, Math.min(99999, Math.round(xp))))
    .padStart(DIGITS, '0')
    .split('');
}

// The split-flap XP counter. First value snaps in silently (the board "flips on");
// later changes cascade right-most digit first, rolling through at most 3
// intermediate digits, 60 ms stagger per column.
export function SplitFlap({ xp }: { xp: number | null }) {
  const [digits, setDigits] = useState<Digit[]>(
    Array.from({ length: DIGITS }, () => ({ c: '—', k: 0 }))
  );
  const digitsRef = useRef(digits);
  digitsRef.current = digits;
  const seenValue = useRef(false);
  const timeouts = useRef<number[]>([]);

  useEffect(() => () => timeouts.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (xp === null) return;
    const target = format(xp);

    if (!seenValue.current) {
      seenValue.current = true;
      setDigits((ds) => target.map((c, i) => ({ c, k: ds[i].k })));
      return;
    }

    if (prefersReducedMotion()) {
      setDigits((ds) => target.map((c, i) => ({ c, k: ds[i].k + 1 })));
      return;
    }

    const setDigit = (i: number, c: string) =>
      setDigits((ds) => {
        const next = ds.slice();
        next[i] = { c, k: ds[i].k + 1 };
        return next;
      });

    target.forEach((tc, i) => {
      const cur = digitsRef.current[i].c;
      if (cur === tc) return;
      const from = /\d/.test(cur) ? +cur : +tc;
      let steps = (+tc - from + 10) % 10;
      if (steps === 0) steps = 10;
      const inter = Math.min(3, steps - 1);
      const seq: string[] = [];
      for (let s = inter; s >= 1; s--) seq.push(String((+tc - s + 10) % 10));
      seq.push(tc);
      seq.forEach((c, j) => {
        timeouts.current.push(
          window.setTimeout(() => setDigit(i, c), (DIGITS - 1 - i) * 60 + j * 110)
        );
      });
    });
  }, [xp]);

  return (
    <div className="flap-row" role="img" aria-label={xp === null ? 'XP loading' : `${xp} XP`}>
      {digits.map((d, i) => (
        <div key={`${i}-${d.k}`} className={`flap-digit${d.k > 0 ? ' flipping' : ''}`}>
          {d.c}
          <div className="seam" />
        </div>
      ))}
    </div>
  );
}
