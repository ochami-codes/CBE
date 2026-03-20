import express from "express";
import { supabaseAuth, supabaseAdmin } from "../../supabaseClient.js";

const router = express.Router();

/* =====================================================
   Helpers
===================================================== */

const sanitizeChurchBaseName = (name) =>
  name
    .replace(/\b(sda|church|seventh day adventist)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

const buildFullChurchName = (baseName) => `${baseName} SDA Church`;

const generateChurchCode = (name) =>
  name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

const isValidKenyanPhone = (phone) => {
  if (!phone) return false;
  const cleaned = phone.replace(/\s+/g, "");
  return /^(?:\+254|254|0)(7\d{8}|1\d{8})$/.test(cleaned);
};

const normalizeKenyanPhone = (phone) => {
  let p = phone.replace(/\s+/g, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  if (p.startsWith("+")) p = p.slice(1);
  return p;
};

/* =====================================================
   REGISTER
===================================================== */

router.post("/", async (req, res) => {
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

// 1️⃣ Create auth user
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
  return res.status(400).json({ message: authError.message });
}

const userId = authData.user.id;

// ✅ Normalize phone
const normalizedPhone = normalizeKenyanPhone(phone);

// 2️⃣ Call RPC  (no waiting for trigger)
const { data, error } = await supabaseAdmin.rpc(
  "register_user_rpc",
  {
    p_user_id: userId,
    p_full_name: full_name,
    p_email: email,
    p_phone: normalizedPhone,
    p_date_of_birth: date_of_birth,
    p_gender: gender,
    p_conference_id: conference_id,
    p_church_name: church_name,
  }
);
    if (error) {
      console.error("❌ RPC ERROR:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });

      return res.status(400).json({
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
    }

    return res.status(201).json(data);

  } catch (err) {
    console.error("🔥 Registration error FULL:", err);

    return res.status(500).json({
      message: err.message || "Registration failed",
    });
  }
});

export default router;
