import express from "express";
import { supabaseAuth, supabaseAdmin } from "../../supabaseClient.js";
import { pool } from "../../db.js";

const router = express.Router();

/* =====================================================
   Helpers
===================================================== */

const sanitizeChurchBaseName = (name = "") =>
  name
    .replace(/\b(sda|church|seventh day adventist)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

const buildFullChurchName = (baseName) =>
  `${baseName} SDA Church`;

const generateChurchCode = (name = "") =>
  name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

const isValidKenyanPhone = (phone) => {
  if (!phone) return false;
  const cleaned = phone.replace(/\s+/g, "");
  return /^(?:\+254|254|0)(7\d{8}|1\d{8})$/.test(cleaned);
};

const normalizeKenyanPhone = (phone = "") => {
  let p = phone.replace(/\s+/g, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  if (p.startsWith("+")) p = p.slice(1);
  return p;
};

/* =====================================================
   Route
===================================================== */

router.post("/", async (req, res) => {
  const client = await pool.connect();

  let createdAuthUserId = null; // 👈 used for rollback

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

    /* ---------------- Validation ---------------- */
    if (!email || !password || !full_name || !church_name) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    if (phone && !isValidKenyanPhone(phone)) {
      return res.status(400).json({
        message: "Invalid Kenyan phone number",
      });
    }

    const normalizedPhone = normalizeKenyanPhone(phone);

    /* ---------------- 1. Create auth user ---------------- */
    const { data: authData, error: authError } =
      await supabaseAuth.auth.signUp({
        email,
        password,
        options: {
          data: { full_name },
          emailRedirectTo: `${process.env.FRONTEND_URL}/auth/callback`,
        },
      });

    if (authError) {
      return res.status(400).json({
        message: authError.message,
      });
    }

    const userId = authData?.user?.id;

    if (!userId) {
      throw new Error("Auth user creation failed");
    }

    createdAuthUserId = userId; // 👈 mark for rollback

    /* ---------------- Prepare church data ---------------- */
    const baseName = sanitizeChurchBaseName(church_name);
    const finalName = buildFullChurchName(baseName);
    const churchCode = generateChurchCode(baseName);

    /* ---------------- TRANSACTION START ---------------- */
    await client.query("BEGIN");

    /* ---------------- 2. Get or create church ---------------- */
    let churchResult = await client.query(
      `SELECT * FROM churches
       WHERE church_code = $1 AND conference_id = $2
       LIMIT 1`,
      [churchCode, conference_id]
    );

    let church = churchResult.rows[0];

    if (!church) {
      const insertChurch = await client.query(
        `INSERT INTO churches (name, church_code, conference_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [finalName, churchCode, conference_id]
      );

      church = insertChurch.rows[0];

      /* Create default departments */
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

    /* ---------------- 3. Get profile ---------------- */
    const profileRes = await client.query(
      `SELECT * FROM profiles WHERE auth_user_id = $1 LIMIT 1`,
      [userId]
    );

    if (!profileRes.rows.length) {
      throw new Error("Profile missing");
    }

    const profile = profileRes.rows[0];

    /* ---------------- 4. Count members ---------------- */
    const countRes = await client.query(
      `SELECT COUNT(*) FROM members WHERE church_id = $1`,
      [church.id]
    );

    const memberCount = parseInt(countRes.rows[0].count, 10);
    const isFirstUser = memberCount === 0;

    /* ---------------- 5. Update profile ---------------- */
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
        full_name,
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

    let member = null;

    /* ---------------- 6. Create member if first user ---------------- */
    if (isFirstUser) {
      const memberRes = await client.query(
        `INSERT INTO members (profile_id, church_id, status)
         VALUES ($1, $2, 'active')
         RETURNING *`,
        [profile.id, church.id]
      );

      member = memberRes.rows[0];

      /* Assign Admin role */
      const roleRes = await client.query(
        `SELECT id FROM roles WHERE LOWER(name) = 'admin' LIMIT 1`
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
