// backend/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;

// 🔓 Public client (RLS enforced) – auth ONLY
export const supabaseAuth = createClient(
  supabaseUrl,
  process.env.SUPABASE_ANON_KEY
);

// 🔐 Admin client (RLS bypass) – database access
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
