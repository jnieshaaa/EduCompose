import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env
  .VITE_SUPABASE_ANON_KEY as string | undefined;


if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. " +
      "Teacher features that load data from Supabase will not work until these env vars are configured."
  );
}

export const supabase = createClient(
  supabaseUrl ?? "http://localhost:54321",
  supabaseAnonKey ?? "public-anon-key-not-configured",
  {
    auth: {
      storageKey: "educompose-auth-storage"
    }
  }
);

// Admin actions are now handled via the backend API proxy for security.
// The supabaseAdmin client has been removed from the frontend.
export const supabaseAdmin = supabase; // Fallback to standard client to avoid breaking imports


