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
// WARNING: Using service_role in the frontend is normally discouraged due to security risks.
export const supabaseAdmin = createClient(
  supabaseUrl ?? "http://localhost:54321",
  supabaseServiceRoleKey || "missing-service-role-key",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      fetch: (url, options) => {
        const headers = new Headers(options?.headers);
        // GATEWAY: Use the anon key for the apikey header to satisfy the gateway without triggering browser locks
        if (supabaseAnonKey) {
          headers.set("apikey", supabaseAnonKey);
        }
        // AUTH: Use the service role key in Authorization to get admin privileges
        if (supabaseServiceRoleKey) {
          headers.set("Authorization", `Bearer ${supabaseServiceRoleKey}`);
        }
        return fetch(url, { ...options, headers });
      }
    }
  }
);

if (!supabaseServiceRoleKey) {
  console.error(
    "[Supabase] VITE_SUPABASE_SERVICE_ROLE_KEY is missing! " +
    "Admin actions (like student provisioning) WILL FAIL. " +
    "Please add it to your .env.local or Vercel environment variables."
  );
}


