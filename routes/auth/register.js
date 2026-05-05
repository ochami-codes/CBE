import express from "express";
import { supabaseAuth, supabaseAdmin } from "../../supabaseClient.js";
import { pool } from "../../db.js";

import {
  normalizeKenyanPhone,
  isValidKenyanPhone,
} from "../../utils/phone.js";

import { toNameCase } from "../../utils/formatters.js";

const router = express.Router();

/* =====================================================
   REGISTER USER (AUTH + PROFILE ONLY)
===================================================== */
router.post("/", async (req, res) => {
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
    } = req.body;

    /* ---------------- VALIDATION ---------------- */
    if (!email || !password || !full_name) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (phone && !isValidKenyanPhone(phone)) {
      return res.status(400).json({ message: "Invalid Kenyan phone number" });
    }

    const normalizedPhone = phone ? normalizeKenyanPhone(phone) : null;
    const formattedName = toNameCase(full_name);

    /* ---------------- CREATE AUTH USER ---------------- */
    const { data: authData, error: authError } =
      await supabaseAuth.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: formattedName },
          emailRedirectTo: `${process.env.FRONTEND_URL}/auth/callback`,
        },
      });

    if (authError) {
      return res.status(400).json({ message: authError.message });
    }

    const userId = authData?.user?.id;
    if (!userId) throw new Error("Auth user creation failed");

    createdAuthUserId = userId;

    /* ---------------- START TRANSACTION ---------------- */
    await client.query("BEGIN");

    /* ---------------- CREATE / UPDATE PROFILE ---------------- */
    const profileRes = await client.query(
      `INSERT INTO profiles (
        auth_user_id,
        full_name,
        email,
        phone,
        date_of_birth,
        gender,
        is_system_user
      )
      VALUES ($1,$2,$3,$4,$5,$6,TRUE)
      ON CONFLICT (auth_user_id)
      DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        date_of_birth = EXCLUDED.date_of_birth,
        gender = EXCLUDED.gender
      RETURNING *`,
      [
        userId,
        formattedName,
        email,
        normalizedPhone,
        date_of_birth,
        gender,
      ]
    );

    const profile = profileRes.rows[0];

    /* ---------------- COMMIT ---------------- */
    await client.query("COMMIT");

    return res.status(201).json({
      message: "Registration successful. Please verify your email.",
      profile,
    });

  } catch (err) {
    /* ---------------- ROLLBACK DB ---------------- */
    await client.query("ROLLBACK");

    /* ---------------- ROLLBACK AUTH ---------------- */
    if (createdAuthUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
        console.log("🧹 Rolled back auth user:", createdAuthUserId);
      } catch (cleanupErr) {
        console.error("⚠️ Failed to rollback auth user:", cleanupErr);
      }
    }

    console.error("❌ Registration error:", err);

    return res.status(500).json({
      message: err.message || "Registration failed",
    });
  } finally {
    client.release();
  }
});

export default router;
