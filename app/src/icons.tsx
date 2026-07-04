import type { RewardIcon } from './api';

// Semantic reward-icon key → tiny 1.5px-stroke glyph drawn in bone.
const STROKE = {
  stroke: '#E8E3D5',
  strokeWidth: 1.5,
  fill: 'none',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const SHAPES: Record<RewardIcon, JSX.Element> = {
  badge: (
    <>
      <circle {...STROKE} cx={10} cy={9} r={5} />
      <path {...STROKE} d="M7 13l-1 5 4-2 4 2-1-5" />
    </>
  ),
  token: (
    <>
      <circle {...STROKE} cx={10} cy={10} r={7} />
      <circle {...STROKE} cx={10} cy={10} r={3.5} />
    </>
  ),
  ticket: (
    <>
      <rect {...STROKE} x={3} y={6} width={14} height={9} />
      <line {...STROKE} x1={12} y1={6} x2={12} y2={15} strokeDasharray="2 2" />
    </>
  ),
  lamp: (
    <>
      <circle {...STROKE} cx={10} cy={8} r={4} />
      <line {...STROKE} x1={10} y1={12} x2={10} y2={17} />
      <line {...STROKE} x1={7} y1={17} x2={13} y2={17} />
    </>
  ),
  key: (
    <>
      <circle {...STROKE} cx={6} cy={10} r={3} />
      <line {...STROKE} x1={9} y1={10} x2={17} y2={10} />
      <line {...STROKE} x1={14} y1={10} x2={14} y2={13} />
    </>
  ),
  crown: <path {...STROKE} d="M4 14V8l3.5 3L10 6l2.5 5L16 8v6z" />,
  flag: (
    <>
      <line {...STROKE} x1={6} y1={4} x2={6} y2={17} />
      <path {...STROKE} d="M6 5h9l-2.5 3L15 11H6" />
    </>
  ),
  stamp: (
    <>
      <rect {...STROKE} x={4} y={4} width={12} height={12} />
      <rect {...STROKE} x={7.5} y={7.5} width={5} height={5} />
    </>
  ),
};

export function RewardGlyph({ icon }: { icon: RewardIcon }) {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" aria-hidden="true">
      {SHAPES[icon] ?? SHAPES.badge}
    </svg>
  );
}
