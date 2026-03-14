import { createClient } from "@supabase/supabase-js";

/**
 * WARNING: This client uses the Service Role Key (Master Key).
 * It has full bypass of Row Level Security (RLS).
 * 
 * ONLY use this for development/demo purposes to avoid running a backend.
 * DO NOT use this in a real production frontend because it exposes your master key.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseServiceKey) {
  console.error("VITE_SUPABASE_SERVICE_ROLE_KEY is missing! Admin features will fail.");
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
