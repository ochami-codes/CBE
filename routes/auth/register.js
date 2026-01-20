// backend/routes/auth/register.js
import express from "express";
import { supabase } from "../../supabaseClient.js";

const router = express.Router();

// POST /auth/register
router.post("/", async (req, res) => {
  const { full_name, email, password, church_name, church_address } = req.body;

  if (!full_name || !email || !password || !church_name) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    let church;

    // 1️⃣ Check if church exists
    const { data: existingChurch, error: churchFetchError } = await supabase
      .from("churches")
      .select("*")
      .eq("name", church_name.trim())
      .maybeSingle();

    if (churchFetchError) {
      console.error("Fetch church error:", churchFetchError);
      return res.status(500).json({ error: "Failed to fetch church." });
    }

    if (existingChurch) {
      church = existingChurch;
    } else {
      // 2️⃣ Create new church
      const { data: newChurch, error: churchInsertError } = await supabase
        .from("churches")
        .insert({
          name: church_name.trim(),
          address: church_address || null,
        })
        .select()
        .single();

      if (churchInsertError) {
        console.error("Create church error:", churchInsertError);
        return res.status(500).json({ error: "Failed to create church." });
      }

      church = newChurch;

      // 3️⃣ Seed default departments
      const defaultDepartments = [
        "Children",
        "Youth / Ambassadors",
        "Treasury",
        "Communication",
        "Sabbath School",
      ];

      const { error: deptError } = await supabase
        .from("departments")
        .insert(defaultDepartments.map((name) => ({
          name,
          church_id: church.id,
        })));

      if (deptError) {
        console.error("Insert departments error:", deptError);
      }

      // 4️⃣ Seed announcements
      const { data: commDept } = await supabase
        .from("departments")
        .select("id")
        .eq("church_id", church.id)
        .eq("name", "Communication")
        .single();

      if (commDept) {
        await supabase.from("announcements").insert({
          church_id: church.id,
          title: "Welcome to ChurchApp 🎉",
          message: "Welcome to our church family! Stay tuned for updates.",
          department_id: commDept.id,
        });
      }

      // 5️⃣ Seed treasury groups & funds
      const fundGroups = [
        "Tithe & Trust",
        "Local Church",
        "Special Offerings",
      ];

      const { data: insertedGroups } = await supabase
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

      const { data: insertedFunds } = await supabase
        .from("treasury_funds")
        .insert(funds.map((f) => ({
          name: f.name,
          group_id: insertedGroups.find((g) => g.name === f.group)?.id,
          church_id: church.id,
        })))
        .select();

      // Optional: zeroed opening balances
      if (insertedFunds?.length) {
        await supabase.from("treasury_transactions").insert(
          insertedFunds.map((f) => ({
            fund_id: f.id,
            amount: 0,
            type: "income",
            given_by: "system",
            recorded_by: null,
            church_id: church.id,
          }))
        );
      }
    }

    // 6️⃣ Determine role
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("church_id", church.id);

    const roleName = count === 0 ? "Admin" : "Member";

    const { data: role } = await supabase
      .from("roles")
      .select("id")
      .eq("name", roleName)
      .single();

    if (!role) {
      return res.status(500).json({ error: "Role not found." });
    }

    // 7️⃣ Create Supabase Auth user safely
    let authData;
    try {
      const result = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
      });
      authData = result.data;
    } catch (err) {
      if (err?.message?.includes("already been registered")) {
        return res.status(400).json({
          error: "This email is already registered. Please log in or reset your password."
        });
      }
      throw err;
    }

    const userId = authData.user.id;

    // 8️⃣ Insert profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        full_name,
        email,
        role_id: role.id,
        church_id: church.id,
      })
      .select()
      .single();

    if (profileError) {
      console.error("Insert profile error:", profileError);
      return res.status(500).json({ error: "Failed to create user profile." });
    }

    res.status(201).json({
      message: "Registration successful. Please verify your email.",
      user: {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        role: roleName,
        church: church.name,
      },
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({
      error: "Registration failed",
      details: err.message || "Unknown error",
    });
  }
});

export default router;
