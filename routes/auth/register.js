// backend/routes/auth/register.js
import express from "express";
import { supabaseAuth, supabaseAdmin } from "../../supabaseClient.js";

const router = express.Router();

/* ------------------ Helpers ------------------ */

const sanitizeChurchBaseName = (name) =>
  name
    .replace(/\b(sda|church|seventh day adventist)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

const buildFullChurchName = (baseName) => `${baseName} SDA Church`;

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

/* ------------------ POST /auth/register ------------------ */

router.post("/", async (req, res) => {
  try {
    const {
      full_name,
      email,
      password,
      phone,
      date_of_birth,
      gender,
      conference,
      church_name,
    } = req.body;

    /* ------------------ 1️⃣ Validate ------------------ */
    if (
      !full_name ||
      !email ||
      !password ||
      !phone ||
      !date_of_birth ||
      !gender ||
      !conference ||
      !church_name
    ) {
      return res.status(400).json({
        message: "All required fields must be provided",
      });
    }

    if (!isValidKenyanPhone(phone)) {
      return res.status(400).json({
        message: "Enter a valid Kenyan phone number",
      });
    }

    const baseName = sanitizeChurchBaseName(church_name);
    if (!baseName) {
      return res.status(400).json({ message: "Invalid church name" });
    }

    const normalizedPhone = normalizeKenyanPhone(phone);
    const finalChurchName = buildFullChurchName(baseName);

    /* ------------------ 2️⃣ Find or create church ------------------ */
    let church;

    const { data: existingChurch, error: churchError } =
      await supabaseAdmin
        .from("churches")
        .select("*")
        .eq("name", finalChurchName)
        .maybeSingle();

    if (churchError) throw churchError;

    if (existingChurch) {
      church = existingChurch;
    } else {
      const { data: newChurch, error: insertChurchError } =
        await supabaseAdmin
          .from("churches")
          .insert({ name: finalChurchName })
          .select()
          .single();

      if (insertChurchError) throw insertChurchError;
      church = newChurch;

      // Seed departments (codes should already be normalized elsewhere)
      await supabaseAdmin.from("departments").insert([
        { name: "Children", code: "children", church_id: church.id },
        { name: "Youth", code: "youth", church_id: church.id },
        { name: "Treasury", code: "treasury", church_id: church.id },
        { name: "Communication", code: "communication", church_id: church.id },
        { name: "Sabbath School", code: "sabbath_school", church_id: church.id },
      ]);
    }

    /* ------------------ 3️⃣ Determine first user ------------------ */
    const { data: existingProfiles, error: profilesError } =
      await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("church_id", church.id);

    if (profilesError) throw profilesError;

    const isFirstUser = existingProfiles.length === 0;

    /* ------------------ 4️⃣ Create auth user ------------------ */
    const { data: authData, error: authError } =
      await supabaseAuth.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.FRONTEND_URL}/auth/callback`,
        },
      });

    if (authError) {
      if (authError.message?.toLowerCase().includes("already")) {
        return res.status(400).json({
          message: "This email is already registered. Please log in.",
        });
      }
      throw authError;
    }

    const userId = authData.user.id;

    /* ------------------ 5️⃣ Create profile (ALWAYS) ------------------ */
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        full_name,
        email,
        phone: normalizedPhone,
        date_of_birth,
        gender,
        conference,
        church_id: church.id,
      });

    if (profileError) throw profileError;

    /* ------------------ 6️⃣ Create member ONLY for first user ------------------ */
    if (isFirstUser) {
      const { error: memberError } = await supabaseAdmin
        .from("members")
        .insert({
          id: userId, // intentional: system user
          full_name,
          role_name: "Admin",
          active: true,
          church_id: church.id,
        });

      if (memberError) throw memberError;
    }

    /* ------------------ 7️⃣ Done ------------------ */
    return res.status(201).json({
      message:
        "Registration successful. Please verify your email before logging in.",
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({
      message: "Registration failed",
    });
  }
});

export default router;
