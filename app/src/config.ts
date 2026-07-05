// Integration constants. Override at build/dev time with the VITE_* env vars.
export const INGEST_URL: string =
  import.meta.env.VITE_INGEST_URL ?? 'http://localhost:8081';
export const API_URL: string =
  import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

// When true, the app uses an in-memory mock instead of the real services.
export const IS_MOCK: boolean = import.meta.env.VITE_MOCK === 'true';

// Mock-only tunables (ignored when IS_MOCK is false).
const parseNumber = (v: string | undefined, fallback: number) => {
  const n = v === undefined ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
};
export const MOCK_START_XP = parseNumber(import.meta.env.VITE_START_XP, 1340);
export const MOCK_FAILURE_RATE = parseNumber(import.meta.env.VITE_FAILURE_RATE, 0.05);

// Identity is fake per spec — no auth anywhere.
export const PLAYER_ID = 'player-david';
