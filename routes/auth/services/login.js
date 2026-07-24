// services/auth.service.js

import { supabaseAuth, supabaseAdmin } from "../../../supabaseClient.js";
import { validateLoginInput } from "../../../validators/auth/loginValidator.js";

export async function login({email, password}) {
  validateLoginInput({email, password});

  const { data, error } =
    await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

  if (error || !data?.user || !data?.session) {
    throw new Error("Invalid email or password.");
  }

  const { user, session } = data;

  if (!user.email_confirmed_at) {
    throw new Error(
      "Please verify your email before logging in."
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabaseAdmin
    .from("profiles")
    .select(`
      id,
      auth_user_id,
      full_name,
      email,
      active_church_id
    `)
    .eq("auth_user_id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found.");
  }

  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    user: profile,
  };
}
