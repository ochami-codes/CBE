import {
  supabaseAuth,
  supabaseAdmin,
} from "../../../supabaseClient.js";

import { pool } from "../../../db.js";

import { validateRegisterInput } from "../../../utils/validators/auth/registerValidator.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function register(input) {
  const client = await pool.connect();

  let createdAuthUserId = null;

  try {
    const {
      full_name,
      email,
      password,
      phone,
      date_of_birth,
      gender,
    } = validateRegisterInput(input);

    /* ---------------- Create auth user ---------------- */

    const {
      data: authData,
      error: authError,
    } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
        },
        emailRedirectTo:
          `${process.env.FRONTEND_URL}/auth/callback`,
      },
    });

    if (authError) {
      throw new Error(authError.message);
    }

    const userId = authData?.user?.id;

    if (!userId) {
      throw new createAppError(
        "Auth user creation failed.",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }

    createdAuthUserId = userId;

    /* ---------------- Update profile ---------------- */

    await client.query("BEGIN");

    const { rows } = await client.query(
      `
      UPDATE profiles
      SET
        full_name = COALESCE($1, full_name),
        phone = COALESCE($2, phone),
        date_of_birth = COALESCE($3, date_of_birth),
        gender = COALESCE($4, gender),
        updated_at = NOW()
      WHERE auth_user_id = $5
      RETURNING *;
      `,
      [
        full_name,
        phone,
        date_of_birth,
        gender,
        userId,
      ]
    );

    const profile = rows[0];

    if (!profile) {
      throw createAppError(
        "Profile was not created by trigger.",
        500,
        ERROR_CODES.DATABASE_ERROR
      );
    }

    await client.query("COMMIT");

    return {
      message:
        "Registration successful. Please verify your email.",
      profile,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    if (createdAuthUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(
          createdAuthUserId
        );
      } catch (cleanupError) {
        console.error(
          "Failed to rollback auth user:",
          cleanupError
        );
      }
    }

    throw error;
  } finally {
    client.release();
  }
}
