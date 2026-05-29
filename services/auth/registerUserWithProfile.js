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

    if (!email || !password || !full_name) {
      throw new Error(
        "Missing required fields"
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
            full_name:
              formattedName,
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
       START TRANSACTION
    ===================================================== */

    await client.query("BEGIN");

    /* =====================================================
       LOOKUP EXISTING PROFILE
    ===================================================== */

    let existingProfile = null;

    // Priority 1 → Email
    const emailLookup =
      await client.query(
        `
        SELECT *
        FROM profiles
        WHERE email = $1
        LIMIT 1
        `,
        [email]
      );

    existingProfile =
      emailLookup.rows[0];

    // Priority 2 → Phone
    if (
      !existingProfile &&
      normalizedPhone
    ) {

      const phoneLookup =
        await client.query(
          `
          SELECT *
          FROM profiles
          WHERE phone = $1
          LIMIT 1
          `,
          [normalizedPhone]
        );

      existingProfile =
        phoneLookup.rows[0];
    }

    /* =====================================================
       PROFILE UPSERT + LINK
    ===================================================== */

    let profile;

    if (existingProfile) {

      // Prevent linking twice
      if (
        existingProfile.auth_user_id
      ) {
        throw new Error(
          "Profile already linked to a system user"
        );
      }

      // Existing non-system user
      const updateRes =
        await client.query(
          `
          UPDATE profiles
          SET
            auth_user_id = $1,
            is_system_user = TRUE,
            full_name = COALESCE($2, full_name),
            email = COALESCE($3, email),
            phone = COALESCE($4, phone),
            date_of_birth = COALESCE(
              $5,
              date_of_birth
            ),
            gender = COALESCE(
              $6,
              gender
            ),
            updated_at = NOW()
          WHERE id = $7
          RETURNING *
          `,
          [
            userId,
            formattedName,
            email,
            normalizedPhone,
            date_of_birth,
            gender,
            existingProfile.id,
          ]
        );

      profile =
        updateRes.rows[0];

    } else {

      // Fresh profile
      const insertRes =
        await client.query(
          `
          INSERT INTO profiles (
            auth_user_id,
            full_name,
            email,
            phone,
            date_of_birth,
            gender,
            is_system_user
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,TRUE
          )
          RETURNING *
          `,
          [
            userId,
            formattedName,
            email,
            normalizedPhone,
            date_of_birth,
            gender,
          ]
        );

      profile =
        insertRes.rows[0];
    }

    /* =====================================================
       COMMIT
    ===================================================== */

    await client.query("COMMIT");

    return {
      message:
        "Registration successful. Please verify your email.",

      profile,
    };

  } catch (err) {

    /* =====================================================
       ROLLBACK DB
    ===================================================== */

    await client.query(
      "ROLLBACK"
    );

    /* =====================================================
       ROLLBACK AUTH
    ===================================================== */

    if (createdAuthUserId) {

      try {

        await supabaseAdmin
          .auth
          .admin
          .deleteUser(
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