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
    /* ======================================================
       1️⃣ FIND OR CREATE CHURCH
    ====================================================== */

    let church;

    const { data: existingChurch, error: findChurchError } =
      await supabase
        .from("churches")
        .select("*")
        .eq("name", church_name.trim())
        .maybeSingle();

    if (findChurchError) throw findChurchError;

    if (existingChurch) {
      church = existingChurch;
    } else {
      const { data: newChurch, error: createChurchError } =
        await supabase
          .from("churches")
          .insert({
            name: church_name.trim(),
            address: church_address || null,
          })
          .select()
          .single();

      if (createChurchError || !newChurch) {
        throw createChurchError || new Error("Failed to create church");
      }

      church = newChurch;

      /* ======================================================
         2️⃣ DEFAULT DEPARTMENTS
      ====================================================== */

      const defaultDepartments = [
        "Children",
        "Youth / Ambassadors",
        "Treasury",
        "Communication",
        "Sabbath School",
      ];

      const { error: deptError } = await supabase
        .from("departments")
        .insert(
          defaultDepartments.map((name) => ({
            name,
            church_id: church.id,
          }))
        );

      if (deptError) throw deptError;

      /* ======================================================
         3️⃣ COMMUNICATION ANNOUNCEMENT
      ====================================================== */

      const { data: communicationDept, error: commDeptError } =
        await supabase
          .from("departments")
          .select("id")
          .eq("name", "Communication")
          .eq("church_id", church.id)
          .single();

      if (commDeptError || !communicationDept) {
        throw new Error("Communication department missing");
      }

      const { error: announcementError } = await supabase
        .from("announcements")
        .insert({
          church_id: church.id,
          title: "Welcome to ChurchApp 🎉",
          message:
            "Welcome to our church family! Stay tuned here for announcements, encouragements, and updates.",
          department_id: communicationDept.id,
        });

      if (announcementError) throw announcementError;

      /* ======================================================
         4️⃣ TREASURY FUND GROUPS
      ====================================================== */

      const fundGroups = [
        { name: "Tithe & Trust" },
        { name: "Local Church" },
        { name: "Special Offerings" },
      ];

      const { data: groups, error: groupsError } =
        await supabase
          .from("treasury_fund_groups")
          .insert(
            fundGroups.map((g) => ({
              name: g.name,
              church_id: church.id,
            }))
          )
          .select();

      if (groupsError || !groups?.length) {
        throw groupsError || new Error("Failed to create fund groups");
      }

      const groupId = (name) => {
        const group = groups.find((g) => g.name === name);
        if (!group) throw new Error(`Missing fund group: ${name}`);
        return group.id;
      };

      /* ======================================================
         5️⃣ TREASURY FUNDS
      ====================================================== */

      const funds = [
        { name: "Tithe", group: "Tithe & Trust" },
        { name: "Church Budget", group: "Local Church" },
        { name: "Building Fund", group: "Local Church" },
        { name: "Other Local Funds", group: "Local Church" },
        { name: "Combined Offerings", group: "Special Offerings" },
        { name: "Camp Meeting", group: "Special Offerings" },
      ];

      const { data: insertedFunds, error: fundsError } =
        await supabase
          .from("treasury_funds")
          .insert(
            funds.map((f) => ({
              name: f.name,
              group_id: groupId(f.group),
              church_id: church.id,
            }))
          )
          .select();

      if (fundsError || !insertedFunds?.length) {
        throw fundsError || new Error("Failed to create treasury funds");
      }

      /* ======================================================
         6️⃣ OPENING BALANCES
      ====================================================== */

      const { error: openingBalanceError } = await supabase
        .from("treasury_transactions")
        .insert(
          insertedFunds.map((fund) => ({
            fund_id: fund.id,
            amount: 0,
            type: "income",
            given_by: "system",
            recorded_by: null,
            church_id: church.id,
          }))
        );

      if (openingBalanceError) throw openingBalanceError;
    }

    /* ======================================================
       7️⃣ ROLE ASSIGNMENT
    ====================================================== */

    const { count, error: countError } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("church_id", church.id);

    if (countError) throw countError;

    const roleName = count === 0 ? "Admin" : "Member";

    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("name", roleName)
      .single();

    if (roleError || !role) {
      throw roleError || new Error("Role not found");
    }

    /* ======================================================
       8️⃣ AUTH USER
    ====================================================== */

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
      });

    if (authError || !authData?.user) {
      throw authError || new Error("Auth user creation failed");
    }

    /* ======================================================
       9️⃣ PROFILE
    ====================================================== */

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          full_name,
          email,
          role_id: role.id,
          church_id: church.id,
        })
        .select()
        .single();

    if (profileError || !profile) {
      throw profileError || new Error("Profile creation failed");
    }

    /* ======================================================
       ✅ SUCCESS
    ====================================================== */

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
    console.error("Registration error:", err);
    res.status(500).json({
      error: "Registration failed",
      details: err.message,
    });
  }
});

export default router;
