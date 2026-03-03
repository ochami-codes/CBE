// routes/membership/member.js
import express from "express";
const router = express.Router();

/* =====================================================
   POST /membership-requests
   Logged-in user requests membership
===================================================== */
router.post("/", async (req, res) => {
  try {
    const supabase = req.supabase;

    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = req.user.id;

    // Get selected church from profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("church_id")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Profile load error:", profileError);
      return res.status(500).json({ message: "Failed to load profile" });
    }

    if (!profile?.church_id) {
      return res.status(400).json({
        message: "Church not selected",
      });
    }

    const { data, error } = await supabase.rpc(
      "create_membership_request",
      {
        p_profile_id: userId,
        p_church_id: profile.church_id,
      }
    );

    if (error) {
      console.error("Create membership request RPC error:", error);
      return res.status(400).json({
        message: error.message || "Request failed",
      });
    }

    res.status(201).json(data);

  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});


/* =====================================================
   GET /membership-requests/me
   Get latest membership workflow for logged-in user
===================================================== */
router.get("/me", async (req, res) => {
  try {
    const supabase = req.supabase;

    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const profileId = req.user.id;

    const { data, error } = await supabase
      .from("membership_requests")
      .select(`
        id,
        source,
        status,
        membership_requested_at,
        membership_responded_at,
        acted_by
      `)
      .eq("profile_id", profileId)
      .order("membership_requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Load membership request error:", error);
      return res.status(500).json({
        message: "Failed to load membership request",
      });
    }

    res.json({ request: data || null });

  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});


/* =====================================================
   PATCH /membership-requests/:id/respond
   User responds to an admin invite
   (accepted | rejected)
===================================================== */
router.patch("/:id/respond", async (req, res) => {
  try {
    const supabase = req.supabase;

    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = req.user.id;
    const { id } = req.params;
    const { action } = req.body;

    // Early validation
    if (!["accepted", "rejected"].includes(action)) {
      return res.status(400).json({
        message: "Invalid action",
      });
    }

    const { data, error } = await supabase.rpc(
      "respond_to_membership_invite",
      {
        p_request_id: id,
        p_action: action,
        p_profile_id: userId,
      }
    );

    if (error) {
      console.error("Respond invite RPC error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      return res.status(400).json({
        message: error.message || "Failed to respond to invite",
      });
    }

    res.json(data);

  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});


export default router;
