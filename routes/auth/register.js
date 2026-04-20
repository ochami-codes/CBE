import express from "express";
import { supabaseAuth, supabaseAdmin } from "../../supabaseClient.js";
import { pool } from "../../db.js";

import {
  sanitizeChurchBaseName,
  buildFullChurchName,
  generateChurchCode,
} from "../../utils/church.js";

import {
  normalizeKenyanPhone,
  isValidKenyanPhone,
} from "../../utils/phone.js";

import { toNameCase } from "../../utils/formatters.js";

const router = express.Router();

/* =====================================================
   REGISTER USER
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
      conference_id,
      church_name,
    } = req.body;

    /* ---------------- VALIDATION ---------------- */
    if (!email || !password || !full_name || !church_name) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (phone && !isValidKenyanPhone(phone)) {
      return res.status(400).json({ message: "Invalid Kenyan phone number" });
    }

    const normalizedPhone = normalizeKenyanPhone(phone);
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

    /* ---------------- PREPARE CHURCH DATA ---------------- */
    const baseName = sanitizeChurchBaseName(church_name);
    const finalName = buildFullChurchName(baseName);
    const churchCode = generateChurchCode(baseName);

    /* ---------------- START TRANSACTION ---------------- */
    await client.query("BEGIN");

    /* ---------------- GET OR CREATE CHURCH ---------------- */
    let { rows } = await client.query(
      `SELECT * FROM churches 
       WHERE church_code = $1 AND conference_id = $2 
       LIMIT 1`,
      [churchCode, conference_id]
    );

    let church = rows[0];

    if (!church) {
      const insertRes = await client.query(
        `INSERT INTO churches (name, church_code, conference_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [finalName, churchCode, conference_id]
      );

      church = insertRes.rows[0];

      /* Default departments */
      await client.query(
        `INSERT INTO departments (name, code, church_id)
         VALUES 
          ('Children','children',$1),
          ('Youth','youth',$1),
          ('Choir','choir',$1),
          ('Treasury','treasury',$1)`,
        [church.id]
      );
    }

    /* ---------------- FETCH PROFILE ---------------- */
    const profileRes = await client.query(
      `SELECT * FROM profiles 
       WHERE auth_user_id = $1 
       LIMIT 1`,
      [userId]
    );

    if (!profileRes.rows.length) {
      throw new Error("Profile missing");
    }

    const profile = profileRes.rows[0];

    /* ---------------- MEMBER COUNT ---------------- */
    const countRes = await client.query(
      `SELECT COUNT(*) FROM members WHERE church_id = $1`,
      [church.id]
    );

    const memberCount = Number(countRes.rows[0].count);
    const isFirstUser = memberCount === 0;

    /* ---------------- UPDATE PROFILE ---------------- */
    await client.query(
      `UPDATE profiles SET
        full_name = COALESCE($1, full_name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        date_of_birth = COALESCE($4, date_of_birth),
        gender = COALESCE($5, gender),
        conference_id = COALESCE($6, conference_id),
        church_id = $7,
        is_member = $8,
        is_system_user = TRUE
       WHERE id = $9`,
      [
        formattedName,
        email,
        normalizedPhone,
        date_of_birth,
        gender,
        conference_id,
        church.id,
        isFirstUser,
        profile.id,
      ]
    );

    /* ---------------- CREATE MEMBER (FIRST USER) ---------------- */
    let member = null;

    if (isFirstUser) {
      const memberRes = await client.query(
        `INSERT INTO members (profile_id, church_id, status)
         VALUES ($1, $2, 'active')
         RETURNING *`,
        [profile.id, church.id]
      );

      member = memberRes.rows[0];

      /* Assign admin role */
      const roleRes = await client.query(
        `SELECT id FROM roles 
         WHERE LOWER(name) = 'admin' 
         LIMIT 1`
      );

      const adminRoleId = roleRes.rows[0]?.id;

      if (adminRoleId) {
        await client.query(
          `INSERT INTO member_roles (member_id, role_id)
           VALUES ($1, $2)`,
          [member.id, adminRoleId]
        );
      }
    }

    /* ---------------- COMMIT ---------------- */
    await client.query("COMMIT");

    return res.status(201).json({
      message: isFirstUser
        ? "Registration successful. You are the Admin."
        : "Registration successful. Await approval.",
      church_id: church.id,
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
