// Integration constants. Override at build/dev time with the VITE_* env vars.
export const INGEST_URL: string =
  import.meta.env.VITE_INGEST_URL ?? 'http://localhost:8081';
export const API_URL: string =
  import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

// When true, the app uses an in-memory mock instead of the real services.
export const IS_MOCK: boolean = import.meta.env.VITE_MOCK === 'true';

// Identity is fake per spec — no auth anywhere.
export const PLAYER_ID = 'player-david';
