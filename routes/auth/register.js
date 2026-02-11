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

    /* ------------------ Validation ------------------ */
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

    /* ------------------ Find or create church ------------------ */
    let church;

    const { data: existingChurch, error: churchError } = await supabaseAdmin
      .from("churches")
      .select("*")
      .eq("name", finalChurchName)
      .maybeSingle();

    if (churchError) throw churchError;

    if (existingChurch) {
      church = existingChurch;
    } else {
      const { data: newChurch, error: insertChurchError } = await supabaseAdmin
        .from("churches")
        .insert({ name: finalChurchName })
        .select()
        .single();

      if (insertChurchError) throw insertChurchError;
      church = newChurch;

      // Seed default departments
      const departments = [
        { name: "Children", code: "children" },
        { name: "Youth", code: "youth" },
        { name: "Treasury", code: "treasury" },
        { name: "Communication", code: "communication" },
        { name: "Sabbath School", code: "sabbath_school" },
      ];

      await supabaseAdmin
        .from("departments")
        .insert(departments.map((d) => ({ ...d, church_id: church.id })));
    }

    /* ------------------ Determine first user ------------------ */
    const { data: existingProfiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("church_id", church.id);

    if (profilesError) throw profilesError;

    const isFirstUser = existingProfiles.length === 0;

    /* ------------------ Fetch roles ------------------ */
    const { data: adminRole } = await supabaseAdmin
      .from("roles")
      .select("id")
      .eq("name", "Admin")
      .single();

    const { data: memberRole } = await supabaseAdmin
      .from("roles")
      .select("id")
      .eq("name", "Member")
      .single();

    if (!adminRole?.id || !memberRole?.id) {
      return res.status(500).json({ message: "Role configuration error" });
    }

    const roleId = isFirstUser ? adminRole.id : memberRole.id;

    /* ------------------ Create auth user ------------------ */
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

    /* ------------------ Create profile (ALL users) ------------------ */
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      full_name,
      email,
      phone: normalizedPhone,
      date_of_birth,
      gender,
      conference,
      church_id: church.id,
      role_id: roleId,
    });

    if (profileError) throw profileError;

    /* ------------------ Create member (ONLY first user) ------------------ */
    if (isFirstUser) {
      const { error: memberError } = await supabaseAdmin.from("members").insert({
        id: userId,
        full_name,
        role_name: "Admin",
        active: true,
        church_id: church.id,
      });

      if (memberError) throw memberError;
    }

    /* ------------------ Success ------------------ */
    return res.status(201).json({
      message:
        "Registration successful. Please verify your email and await membership approval.",
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({
      message: "Registration failed",
    });
  }
});

export default router;
