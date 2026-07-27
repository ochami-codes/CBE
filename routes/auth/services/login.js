// services/auth.service.js

import { supabaseAuth, supabaseAdmin } from "../../../supabaseClient.js";
import { validateLoginInput } from "../../../validators/auth/loginValidator.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";
export async function login({email, password}) {
  validateLoginInput({email, password});

  const { data, error } =
    await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

  if (error || !data?.user || !data?.session) {
    throw createAppError("Invalid email or password.", 400, ERROR_CODES.INVALID_CREDENTIALS );
  }

  const { user, session } = data;

  if (!user.email_confirmed_at) {
    throw createAppError(
      "Please verify your email before logging in.",
      400,
      ERROR_CODES.EMAIL_NOT_CONFIRMED
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
    throw createAppError("Profile not found.", 404, ERROR_CODES.NOT_FOUND );
  }

  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    user: profile,
  };
}
