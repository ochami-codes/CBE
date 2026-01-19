// backend/routes/auth/register.js
import express from "express";
import { supabase } from "../../supabaseClient.js";

const router = express.Router();

// POST /auth/register
router.post("/", async (req, res) => {
  const { full_name, email, password, church_name, church_address } = req.body;

  if (!full_name || !email || !password || !church_name) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    let church;
    let isNewChurch = false;

    // ------------------ FIND OR CREATE CHURCH ------------------
    const { data: existingChurch, error: churchFetchError } = await supabase
      .from("churches")
      .select("*")
      .eq("name", church_name.trim())
      .maybeSingle();

    if (churchFetchError) {
      console.error("Fetch church error:", churchFetchError);
      return res.status(500).json({ error: "Failed to fetch church", details: churchFetchError });
    }

    if (existingChurch) {
      church = existingChurch;
    } else {
      isNewChurch = true;
      const { data: newChurch, error: churchInsertError } = await supabase
        .from("churches")
        .insert({ name: church_name.trim(), address: church_address || null })
        .select()
        .single();

      if (churchInsertError) {
        console.error("Insert church error:", churchInsertError);
        return res.status(500).json({ error: "Failed to create church", details: churchInsertError });
      }

      church = newChurch;

      // ------------------ DEFAULT DEPARTMENTS ------------------
      const defaultDepartments = [
        "Children",
        "Youth / Ambassadors",
        "Treasury",
        "Communication",
        "Sabbath School",
      ];

      const { error: deptError } = await supabase
        .from("departments")
        .insert(defaultDepartments.map(name => ({ name, church_id: church.id })));

      if (deptError) {
        console.error("Insert departments error:", deptError);
        return res.status(500).json({ error: "Failed to create default departments", details: deptError });
      }

      // ------------------ COMMUNICATION SETUP ------------------
      const { data: commDept, error: commDeptError } = await supabase
        .from("departments")
        .select("id")
        .eq("name", "Communication")
        .eq("church_id", church.id)
        .single();

      if (commDeptError || !commDept) {
        console.error("Communication dept fetch error:", commDeptError);
        return res.status(500).json({ error: "Failed to fetch Communication dept", details: commDeptError });
      }

      await supabase.from("announcements").insert({
        church_id: church.id,
        title: "Welcome to ChurchApp 🎉",
        message: "Welcome to our church family! Stay tuned here for announcements, encouragements, and updates.",
        department_id: commDept.id,
      });

      // ------------------ TREASURY SEEDING ------------------
      const fundGroups = [
        { name: "Tithe & Trust" },
        { name: "Local Church" },
        { name: "Special Offerings" },
      ];

      const { data: insertedGroups, error: groupError } = await supabase
        .from("treasury_fund_groups")
        .insert(fundGroups.map(g => ({ name: g.name, church_id: church.id })))
        .select();

      if (groupError) {
        console.error("Insert fund groups error:", groupError);
        return res.status(500).json({ error: "Failed to create fund groups", details: groupError });
      }

      const groupId = (name) => insertedGroups.find(g => g.name === name)?.id;

      const funds = [
        { name: "Tithe", group: "Tithe & Trust" },
        { name: "Church Budget", group: "Local Church" },
        { name: "Building Fund", group: "Local Church" },
        { name: "Other Local Funds", group: "Local Church" },
        { name: "Combined Offerings", group: "Special Offerings" },
        { name: "Camp Meeting", group: "Special Offerings" },
      ];

      const { data: insertedFunds, error: fundsError } = await supabase
        .from("treasury_funds")
        .insert(funds.map(f => ({
          name: f.name,
          group_id: groupId(f.group),
          church_id: church.id,
        })))
        .select();

      if (fundsError) {
        console.error("Insert funds error:", fundsError);
        return res.status(500).json({ error: "Failed to create funds", details: fundsError });
      }

      // Optional: seed opening balances
      await supabase.from("treasury_transactions").insert(
        insertedFunds.map(fund => ({
          fund_id: fund.id,
          amount: 0,
          type: "income",
          given_by: "system",
          recorded_by: null,
          church_id: church.id,
        }))
      );
    }

    // ------------------ ROLE ASSIGNMENT ------------------
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("church_id", church.id);

    const roleName = count === 0 ? "Admin" : "Member";

    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("name", roleName)
      .single();

    if (roleError || !role) {
      console.error("Role fetch error:", roleError);
      return res.status(500).json({ error: "Failed to fetch role", details: roleError });
    }

    // ------------------ AUTH USER ------------------
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });

    if (authError || !authData?.user) {
      console.error("Auth create user error:", authError);
      return res.status(500).json({ error: "Failed to create auth user", details: authError });
    }

    const userId = authData.user.id;

    // ------------------ PROFILE ------------------
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

    if (profileError || !profile) {
      console.error("Insert profile error:", profileError);
      return res.status(500).json({ error: "Failed to create profile", details: profileError });
    }

    res.status(201).json({
      message: "Registration successful. Please verify your email.",
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: roleName,
        church: church.name,
      },
    });

  } catch (err) {
    console.error("Registration error:", {
      name: err.name,
      code: err.code,
      message: err.message,
      details: err.details,
      hint: err.hint,
      stack: err.stack,
    });

    res.status(500).json({
      error: "Registration failed",
      details: err.message || JSON.stringify(err),
      code: err.code || null,
    });
  }
});

export default router;
