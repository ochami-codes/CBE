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

    if (
      !full_name ||
      !email ||
      !password ||
      !phone ||
      !date_of_birth ||
      !gender ||
      !conference_id ||
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

    const normalizedPhone = normalizeKenyanPhone(phone);

    /* ---------- Church resolution ---------- */

    const baseName = sanitizeChurchBaseName(church_name);
    const finalChurchName = buildFullChurchName(baseName);
    const churchCode = generateChurchCode(baseName);

    const { data: conference } = await supabaseAdmin
      .from("conferences")
      .select("id")
      .eq("id", conference_id)
      .maybeSingle();

    if (!conference) {
      return res.status(400).json({
        message: "Invalid conference selected",
      });
    }

    let church;

    const { data: existingChurch } = await supabaseAdmin
      .from("churches")
      .select("*")
      .eq("church_code", churchCode)
      .eq("conference_id", conference_id)
      .maybeSingle();

    if (existingChurch) {
      church = existingChurch;
    } else {
      const { data: newChurch, error } = await supabaseAdmin
        .from("churches")
        .insert({
          name: finalChurchName,
          church_code: churchCode,
          conference_id,
        })
        .select()
        .single();

      if (error) throw error;

      church = newChurch;

      const departments = [
        { name: "Children", code: "children", type: "age" },
        { name: "Youth", code: "youth", type:"age" },
        { name: "Treasury", code: "treasury", type: "ministry" },
        { name: "Choir", code: "choir", type: "ministry" },
        { name: "AMO", code: "amo", type: "age" },
        { name: "ALO", code: "alo", type: "age" },
        { name: "Deaconry", code: "deaconry", type: "ministry" },
        { name: "Communication", code: "communication", type: "ministry" },
        { name: "Sabbath School", code: "sabbath_school", type: "ministry" },
      ];

      await supabaseAdmin.from("departments").insert(
        departments.map((d) => ({
          ...d,
          church_id: church.id,
        }))
      );
    }

    /* ---------- Check for existing non-system member ---------- */

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("church_id", church.id)
      .eq("phone", normalizedPhone)
      .maybeSingle();

    /* ---------- Determine first church member ---------- */

    const { data: approvedMembers } = await supabaseAdmin
      .from("members")
      .select("id")
      .eq("church_id", church.id)
      .eq("active", true);

    const isFirstUser = (approvedMembers?.length || 0) === 0;

    /* ---------- Fetch roles ---------- */

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

    const roleId = isFirstUser ? adminRole.id : guestRole.id;

    /* ---------- Create auth user ---------- */

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
          message: "Email already registered. Please login.",
        });
      }
      throw authError;
    }

    const userId = authData.user.id;

    /* ---------- Wait for trigger profile ---------- */

    let profile;

    for (let i = 0; i < 5; i++) {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (data) {
        profile = data;
        break;
      }

      await new Promise((r) => setTimeout(r, 300));
    }

    if (!profile) {
      throw new Error("Profile creation failed");
    }

    /* ---------- Merge existing non-system profile ---------- */

    if (existingProfile && existingProfile.id !== userId) {
      await supabaseAdmin
        .from("members")
        .update({ id: userId })
        .eq("id", existingProfile.id);

      await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", existingProfile.id);
    }

    /* ---------- Update profile ---------- */

    await supabaseAdmin
      .from("profiles")
      .update({
        full_name,
        email,
        phone: normalizedPhone,
        date_of_birth,
        gender,
        conference_id,
        church_id: church.id,
        role_id: roleId,
        is_member: isFirstUser,
        is_system_user: true,
      })
      .eq("id", userId);

    /* ---------- Bootstrap admin membership ---------- */

    if (isFirstUser) {
      await supabaseAdmin.from("members").insert({
        id: userId,
        church_id: church.id,
        role_name: "Admin",
        active: true,
      });
    }

    return res.status(201).json({
      message: isFirstUser
        ? "Registration successful. You are the church Admin."
        : "Registration successful. Await approval from church leadership.",
    });
  } catch (err) {
    console.error("Registration error:", err);

    return res.status(500).json({
      message: err.message || "Registration failed",
    });
  }
});

export default router;
