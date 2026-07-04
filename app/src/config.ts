// Integration constants (see spec, "Frontend integration notes").
// Override at build time with VITE_INGEST_URL / VITE_API_URL.
export const INGEST_URL: string =
  import.meta.env.VITE_INGEST_URL ?? 'http://localhost:8081';
export const API_URL: string =
  import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

// Identity is fake per spec — no auth anywhere.
export const PLAYER_ID = 'player-david';
