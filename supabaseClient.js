import { createClient } from "@supabase/supabase-js";
import { createCookieStorage } from "./utils/auth/cookieStorage.js";
const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

// Ensure fetch is available in all environments
const fetchFn =
  typeof fetch === "undefined"
    ? globalThis.fetch ||
      (() => {
        throw new Error("fetch not found");
      })
    : fetch;

/* =========================================================
   PUBLIC CLIENT
   ========================================================= */

export const supabaseAuth = createClient(
  supabaseUrl,
  anonKey,
  {
    global: {
      fetch: fetchFn,
    },
  }
);

/* =========================================================
   ADMIN CLIENT
   ========================================================= */

export const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    global: {
      fetch: fetchFn,
    },
  }
);

/* =========================================================
   AUTHENTICATED USER CLIENT
   ========================================================= */

export function createSupabaseUserClient(
  req,
  res
) {
  if (!req || !res) {
    throw new Error(
      "Request and response objects are required."
    );
  }

  const cookieStorage =
    createCookieStorage(req, res);

  return createClient(
    supabaseUrl,
    anonKey,
    {
      auth: {
        storage: cookieStorage,
        autoRefreshToken: false,
        persistSession: true,
        detectSessionInUrl: false,
      },
    }
  );
}