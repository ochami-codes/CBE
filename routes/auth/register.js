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
    /* -------------------------------------------------------
       1️⃣ Guard: profile already exists
    ------------------------------------------------------- */
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      return res.status(400).json({
        error: "This email is already registered. Please log in.",
      });
    }

    /* -------------------------------------------------------
       2️⃣ Church lookup or creation
    ------------------------------------------------------- */
    let church;
    const { data: existingChurch, error: churchFetchError } = await supabase
      .from("churches")
      .select("*")
      .eq("name", church_name.trim())
      .maybeSingle();

    if (churchFetchError) {
      console.error("Fetch church error:", churchFetchError);
      return res.status(500).json({ error: "Failed to fetch church." });
    }

    const isNewChurch = !existingChurch;

    if (existingChurch) {
      church = existingChurch;
    } else {
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

      /* -------------------------------------------------------
         Seed departments
      ------------------------------------------------------- */
      const departments = [
        "Children",
        "Youth / Ambassadors",
        "Treasury",
        "Communication",
        "Sabbath School",
      ];

      await supabase.from("departments").insert(
        departments.map((name) => ({
          name,
          church_id: church.id,
        }))
      );

      /* -------------------------------------------------------
         Seed welcome announcement
      ------------------------------------------------------- */
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

      /* -------------------------------------------------------
         Seed treasury
      ------------------------------------------------------- */
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
        .insert(
          funds.map((f) => ({
            name: f.name,
            group_id: insertedGroups.find((g) => g.name === f.group)?.id,
            church_id: church.id,
          }))
        )
        .select();

      if (insertedFunds?.length) {
        await supabase.from("treasury_transactions").insert(
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

    /* -------------------------------------------------------
       3️⃣ Role assignment (safe)
    ------------------------------------------------------- */
    const roleName = isNewChurch ? "Admin" : "Member";

    const { data: role } = await supabase
      .from("roles")
      .select("id")
      .eq("name", roleName)
      .single();

    if (!role) {
      return res.status(500).json({ error: "Role not found." });
    }

    /* -------------------------------------------------------
       4️⃣ Supabase signup (EMAIL SENT HERE)
    ------------------------------------------------------- */
    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.FRONTEND_URL}/auth/callback`,
        },
      });

    if (authError) {
      if (authError.message.includes("already registered")) {
        return res.status(400).json({
          error: "This email is already registered. Please log in.",
        });
      }
      throw authError;
    }

    const userId = authData.user.id;

    /* -------------------------------------------------------
       5️⃣ Create profile
    ------------------------------------------------------- */
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      full_name,
      email,
      role_id: role.id,
      church_id: church.id,
    });

    if (profileError) {
      console.error("Insert profile error:", profileError);
      return res.status(500).json({ error: "Failed to create profile." });
    }

    /* -------------------------------------------------------
       6️⃣ Success
    ------------------------------------------------------- */
    return res.status(201).json({
      message: "Registration successful. Please check your email to verify.",
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({
      error: "Registration failed",
      details: err.message,
    });
  }
});

export default router;
