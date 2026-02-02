// backend/routes/auth/register.js
import express from "express";
import { supabaseAuth, supabaseAdmin } from "../../supabaseClient.js";

const router = express.Router();

// ------------------ Validation helpers ------------------
const isValidSdaChurchName = (name) => {
  if (!name) return false;
  return name.trim().toLowerCase().endsWith("sda church");
};

const isValidKenyanPhone = (phone) => {
  if (!phone) return false;
  const cleaned = phone.replace(/\s+/g, "");
  const kenyaPhoneRegex = /^(?:\+254|254|0)(7\d{8}|1\d{8})$/;
  return kenyaPhoneRegex.test(cleaned);
};

const normalizeKenyanPhone = (phone) => {
  let p = phone.replace(/\s+/g, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  if (p.startsWith("+")) p = p.slice(1);
  return p;
};

// ------------------ POST /auth/register ------------------
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

    // ------------------ 1️⃣ Required fields ------------------
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
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    // ------------------ 2️⃣ Validation ------------------
    if (!isValidSdaChurchName(church_name)) {
      return res.status(400).json({ message: "Church name must end with 'SDA Church'" });
    }

    if (!isValidKenyanPhone(phone)) {
      return res.status(400).json({ message: "Enter a valid Kenyan phone number" });
    }

    const normalizedPhone = normalizeKenyanPhone(phone);

    // ------------------ 3️⃣ Church lookup / create ------------------
    let church;
    const { data: existingChurch, error: churchFetchError } = await supabaseAdmin
      .from("churches")
      .select("*")
      .eq("name", church_name.trim())
      .maybeSingle();

    if (churchFetchError) throw churchFetchError;

    if (existingChurch) {
      church = existingChurch;
    } else {
      const { data: newChurch, error: churchInsertError } = await supabaseAdmin
        .from("churches")
        .insert({ name: church_name.trim() })
        .select()
        .single();
      if (churchInsertError) throw churchInsertError;
      church = newChurch;

      // Seed default departments
      const departments = [
        "Children",
        "Youth / Ambassadors",
        "Treasury",
        "Communication",
        "Sabbath School",
      ];
      await supabaseAdmin.from("departments").insert(
        departments.map((name) => ({ name, church_id: church.id }))
      );
    }

    // ------------------ 4️⃣ Role assignment ------------------
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

    if (!adminRole || !memberRole) {
      return res.status(500).json({ message: "Role configuration error" });
    }

    const { data: existingProfiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("church_id", church.id);

    if (profilesError) throw profilesError;

    const roleId = existingProfiles?.length > 0 ? memberRole.id : adminRole.id;

    // ------------------ 5️⃣ Create auth user ------------------
    const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${process.env.FRONTEND_URL}/auth/callback` },
    });

    if (authError) {
      if (authError.message?.toLowerCase().includes("already")) {
        return res.status(400).json({ message: "This email is already registered. Please log in." });
      }
      throw authError;
    }

    const userId = authData.user.id;

    // ------------------ 6️⃣ Create profile ------------------
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
        role_id: roleId,
        church_id: church.id,
      });

    if (profileError) throw profileError;

    // ------------------ 7️⃣ Create member ------------------
    const { error: memberError } = await supabaseAdmin
      .from("members")
      .insert({
        id: userId, // same as auth.users.id
        full_name,
        role_name: roleId === adminRole.id ? "Admin" : "Member",
        active: true,
        church_id: church.id,
      });

    if (memberError) throw memberError;

    // ------------------ 8️⃣ Success ------------------
    res.status(201).json({
      message: "Registration successful. Please check your email to verify your account.",
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Registration failed" });
  }
});

export default router;
