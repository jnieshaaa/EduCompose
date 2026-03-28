import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env
  .VITE_SUPABASE_ANON_KEY as string | undefined;

const supabaseServiceRoleKey = import.meta.env
  .VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined;

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

// Admin client for user management in the frontend as requested
export const supabaseAdmin = createClient(
  supabaseUrl ?? "http://localhost:54321",
  supabaseServiceRoleKey ?? supabaseAnonKey ?? "public-anon-key-not-configured",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);


