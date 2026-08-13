import {
  supabaseAuth,
  supabaseAdmin,
} from "../../../supabaseClient.js";

import {
  validateLoginInput,
} from "../../../utils/validators/auth/loginValidator.js";

import {
  mapSupabaseAuthError,
  mapSupabaseDatabaseError,
} from "../../../errors/supabaseError.js";

import {
  createAppError,
} from "../../../errors/AppError.js";

import {
  ERROR_CODES,
} from "../../../errors/errorCodes.js";

export async function login({
  email,
  password,
}) {
  /* -----------------------------
     Validate Input
  ------------------------------ */

  validateLoginInput({
    email,
    password,
  });

  /* -----------------------------
     Authenticate
  ------------------------------ */

  const {
    data,
    error,
  } = await supabaseAuth.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw mapSupabaseAuthError(error);
  }

  /* -----------------------------
     Validate Auth Response
  ------------------------------ */

  if (!data?.user || !data?.session) {
    throw createAppError(
      "Authentication service returned an invalid response.",
      502,
      ERROR_CODES.EXTERNAL_SERVICE_ERROR
    );
  }

  const {
    user,
    session,
  } = data;

  /* -----------------------------
     Email Confirmation
  ------------------------------ */

  if (!user.email_confirmed_at) {
    throw createAppError(
      "Please verify your email before logging in.",
      400,
      ERROR_CODES.EMAIL_NOT_CONFIRMED
    );
  }

  /* -----------------------------
     Fetch Profile
  ------------------------------ */

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

  if (profileError) {
    if (profileError.code === "PGRST116") {
      throw createAppError(
        "Profile not found.",
        404,
        ERROR_CODES.PROFILE_NOT_FOUND
      );
    }

    throw mapSupabaseDatabaseError(profileError);
  }

  if (!profile) {
    throw createAppError(
      "Profile not found.",
      404,
      ERROR_CODES.PROFILE_NOT_FOUND
    );
  }

  /* -----------------------------
     Success
  ------------------------------ */

  return {
    user: profile,

    session: {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
    },
  };
}