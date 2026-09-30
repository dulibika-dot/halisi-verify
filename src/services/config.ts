/**
 * Where the app gets its data.
 *
 *   VITE_USE_MOCK_API=true  (default) → in-browser demo data, works offline
 *   VITE_USE_MOCK_API=false           → real Supabase database (needs the two keys below)
 *
 * Put these in a .env file (see .env.example). Restart `npm run dev` after changing it.
 */
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false';

export const SUPABASE_URL: string | undefined = import.meta.env.VITE_SUPABASE_URL;
/** The "anon" / "publishable" key. It is safe in the browser; database rules protect the data. */
export const SUPABASE_ANON_KEY: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Name shown across the UI */
export const APP_NAME = 'Halisi Verify';
