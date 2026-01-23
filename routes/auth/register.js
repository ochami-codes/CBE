// backend/routes/auth/register.js
import express from "express";
import { supabaseAuth, supabaseAdmin } from "../../supabaseClient.js";

const router = express.Router();

// POST /auth/register
router.post("/", async (req, res) => {
  const { full_name, email, password, church_name, church_address } = req.body;

  if (!full_name || !email || !password || !church_name) {
    return res.status(400).json({ message: "All required fields must be provided" });
  }

  try {
    /* ------------------ 1️⃣ Church lookup or creation ------------------ */
    let church;
    const { data: existingChurch, error: churchFetchError } = await supabaseAdmin
      .from("churches")
      .select("*")
      .eq("name", church_name.trim())
      .maybeSingle();

    if (churchFetchError) throw churchFetchError;

    const isNewChurch = !existingChurch;

    if (existingChurch) {
      church = existingChurch;
    } else {
      const { data: newChurch, error: churchInsertError } = await supabaseAdmin
        .from("churches")
        .insert({ name: church_name.trim(), address: church_address || null })
        .select()
        .single();

      if (churchInsertError) throw churchInsertError;
      church = newChurch;

      // Seed departments
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

      // Seed welcome announcement
      const { data: commDept } = await supabaseAdmin
        .from("departments")
        .select("id")
        .eq("church_id", church.id)
        .eq("name", "Communication")
        .single();

      if (commDept) {
        await supabaseAdmin.from("announcements").insert({
          church_id: church.id,
          title: "Welcome to ChurchApp 🎉",
          message: "Welcome to our church family! Stay tuned for updates.",
          department_id: commDept.id,
        });
      }

      // Seed treasury fund groups and funds
      const fundGroups = ["Tithe & Trust", "Local Church", "Special Offerings"];
      const { data: insertedGroups } = await supabaseAdmin
        .from("treasury_fund_groups")
        .insert(fundGroups.map((name) => ({ name, church_id: church.id })))
        .select();

      const funds = [
        { name: "Tithe", group: "Tithe & Trust" },
        { name: "Church Budget", group: "Local Church" },
        { name: "Building Fund", group: "Local Church" },
        { name: "Other Local Funds", group: "Local Church" },
        { name: "Combined Offerings", group: "Special Offerings" },
        { name: "Camp Meeting", group: "Special Offerings" },
      ];

      const { data: insertedFunds } = await supabaseAdmin
        .from("treasury_funds")
        .insert(
          funds.map((f) => ({
            name: f.name,
            group_id: insertedGroups.find((g) => g.name === f.group)?.id,
            church_id: church.id,
          }))
        )
        .select();

      if (insertedFunds?.length) {
        await supabaseAdmin.from("treasury_transactions").insert(
          insertedFunds.map((f) => ({
            fund_id: f.id,
            amount: 0,
            type: "income",
            given_by: "system",
            church_id: church.id,
          }))
        );
      }
    }

    /* ------------------ 2️⃣ Role assignment ------------------ */
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

    // Check if the church already has users
    const { data: existingProfiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("church_id", church.id);

    if (profilesError) throw profilesError;

    const roleId = existingProfiles?.length > 0 ? memberRole.id : adminRole.id;

    /* ------------------ 3️⃣ Create auth user ------------------ */
    const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.FRONTEND_URL}/auth/callback`,
      },
    });

    if (authError) {
      if (authError.message?.toLowerCase().includes("already")) {
        return res.status(400).json({ message: "This email is already registered. Please log in." });
      }
      throw authError;
    }

    const userId = authData.user.id;

    /* ------------------ 4️⃣ Create profile ------------------ */
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        full_name,
        email,
        role_id: roleId,
        church_id: church.id,
      });

    if (profileError) throw profileError;

    /* ------------------ 5️⃣ Done ------------------ */
    res.status(201).json({
      message: "Registration successful. Please check your email to verify your account.",
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Registration failed" });
  }
});

export default router;
