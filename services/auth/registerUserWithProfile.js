// services/auth/registerUserWithProfile.js
import {
  supabaseAuth,
  supabaseAdmin,
} from "../../supabaseClient.js";

import { pool } from "../../db.js";

import {
  normalizeKenyanPhone,
  isValidKenyanPhone,
} from "../../utils/phone.js";

import {
  toNameCase,
} from "../../utils/formatters.js";

export async function registerUserWithProfile({
  full_name,
  email,
  password,
  phone,
  date_of_birth,
  gender,
}) {
  const client = await pool.connect();

  let createdAuthUserId = null;

  try {
    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!full_name || !email || !password) {
      throw new Error(
        "Full name, email and password are required"
      );
    }

    if (
      phone &&
      !isValidKenyanPhone(phone)
    ) {
      throw new Error(
        "Invalid Kenyan phone number"
      );
    }

    const normalizedPhone = phone
      ? normalizeKenyanPhone(phone)
      : null;

    const formattedName =
      toNameCase(full_name);

    /* =====================================================
       CREATE AUTH USER
    ===================================================== */

    const {
      data: authData,
      error: authError,
    } =
      await supabaseAuth.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: formattedName,
          },
          emailRedirectTo:
            `${process.env.FRONTEND_URL}/auth/callback`,
        },
      });

    if (authError) {
      throw new Error(
        authError.message
      );
    }

    const userId =
      authData?.user?.id;

    if (!userId) {
      throw new Error(
        "Auth user creation failed"
      );
    }

    createdAuthUserId = userId;

    /* =====================================================
       UPDATE PROFILE CREATED BY TRIGGER
    ===================================================== */

    await client.query("BEGIN");

    const profileResult =
      await client.query(
        `
        UPDATE profiles
        SET
          full_name = COALESCE($1, full_name),
          phone = COALESCE($2, phone),
          date_of_birth = COALESCE(
            $3,
            date_of_birth
          ),
          gender = COALESCE(
            $4,
            gender
          ),
          updated_at = NOW()
        WHERE auth_user_id = $5
        RETURNING *
        `,
        [
          formattedName,
          normalizedPhone,
          date_of_birth,
          gender,
          userId,
        ]
      );

    const profile =
      profileResult.rows[0];

    if (!profile) {
      throw new Error(
        "Profile was not created by trigger"
      );
    }

    await client.query("COMMIT");

    return {
      message:
        "Registration successful. Please verify your email.",
      profile,
    };
  } catch (err) {
    await client.query(
      "ROLLBACK"
    );

    if (createdAuthUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(
          createdAuthUserId
        );

        console.log(
          "🧹 Rolled back auth user:",
          createdAuthUserId
        );
      } catch (cleanupErr) {
        console.error(
          "⚠️ Failed to rollback auth user:",
          cleanupErr
        );
      }
    }

    throw err;
  } finally {
    client.release();
  }
}