import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Ensure fetch is available in all environments
const fetchFn = typeof fetch === "undefined" ? (globalThis.fetch || (() => { throw new Error("fetch not found") })) : fetch;

// Public client (auth only)
export const supabaseAuth = createClient(supabaseUrl, anonKey, {
  global: { fetch: fetchFn },
});

// Admin client (service role)
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  global: { fetch: fetchFn },
});
