import express from "express";
import { supabaseAuth, supabaseAdmin } from "../../supabaseClient.js";

const router = express.Router();

/* -----------------------------
   Helpers
----------------------------- */

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

/* -----------------------------
   REGISTER ROUTE
----------------------------- */

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

    /* ---------- Validation ---------- */

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
    const normalizedPhone = normalizeKenyanPhone(phone);
    const finalChurchName = buildFullChurchName(baseName);

    /* ---------- Find or Create Church ---------- */

    let church;

    const { data: existingChurch } = await supabaseAdmin
      .from("churches")
      .select("*")
      .eq("name", finalChurchName)
      .maybeSingle();

    if (existingChurch) {
      church = existingChurch;
    } else {
      const { data: newChurch, error: churchInsertError } =
        await supabaseAdmin
          .from("churches")
          .insert({ name: finalChurchName })
          .select()
          .single();

      if (churchInsertError) throw churchInsertError;

      church = newChurch;

      /* Seed Departments */
      const departments = [
        { name: "Children", code: "children" },
        { name: "Youth", code: "youth" },
        { name: "Treasury", code: "treasury" },
        { name: "Communication", code: "communication" },
        { name: "Sabbath School", code: "sabbath_school" },
      ];

      await supabaseAdmin
        .from("departments")
        .insert(
          departments.map((d) => ({
            ...d,
            church_id: church.id,
          }))
        );
    }

    /* ---------- Determine First User ---------- */

    const { data: adminProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("church_id", church.id)
      .eq("is_member", true);

    const isFirstUser = (adminProfiles?.length || 0) === 0;

    /* ---------- Fetch Roles ---------- */

    const { data: adminRole } = await supabaseAdmin
      .from("roles")
      .select("id")
      .eq("name", "Admin")
      .single();

    const { data: guestRole } = await supabaseAdmin
      .from("roles")
      .select("id")
      .eq("name", "Guest")
      .single();

    if (!adminRole?.id || !guestRole?.id) {
      return res.status(500).json({
        message: "Role configuration error",
      });
    }

    const roleId = isFirstUser ? adminRole.id : guestRole.id;

    /* ---------- Create Auth User ---------- */

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
      if (authError.message?.toLowerCase().includes("already")) {
        return res.status(400).json({
          message: "This email is already registered. Please log in.",
        });
      }
      throw authError;
    }

    const userId = authData.user.id;

    /* ---------- Wait for Trigger Sync ---------- */
    await new Promise((resolve) => setTimeout(resolve, 500));

    /* ---------- Verify Profile Created By Trigger ---------- */

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) {
      throw new Error("Profile record not found after signup");
    }

    /* ---------- Update Profile ---------- */

    const { error: profileUpdateError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name,
        email,
        phone: normalizedPhone,
        date_of_birth,
        gender,
        conference,
        church_id: church.id,
        role_id: roleId,
        is_member: isFirstUser,
      })
      .eq("id", userId);

    if (profileUpdateError) throw profileUpdateError;

    /* ---------- Bootstrap Member Table ---------- */

    if (isFirstUser) {
      const { error: memberError } = await supabaseAdmin
        .from("members")
        .insert({
          profile_id: userId,
          role_name: "Admin",
          active: true,
          church_id: church.id,
        });

      if (memberError) throw memberError;
    }

    return res.status(201).json({
      message: isFirstUser
        ? "Registration successful. You are the church Admin."
        : "Registration successful. Your account is pending approval.",
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({
      message: err.message || "Registration failed",
    });
  }
});

export default router;
