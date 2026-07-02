import { createClient } from "@supabase/supabase-js";

// Publishable (anon) key + URL are safe to ship in client code.
// The managed secret system reserves the SUPABASE_/VITE_SUPABASE_ prefixes,
// so these are inlined here until the managed integration is attached.
const SUPABASE_URL = "https://pxnezeirntxbgvtdyhce.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_foXQAGKPTp4aHEjYEQatEg_bJ8K_yNS";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
