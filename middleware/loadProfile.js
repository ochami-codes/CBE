// middleware/loadProfile.js
import { supabaseAdmin } from "../supabaseClient.js";

export async function loadProfile(req, res, next) {
  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, auth_user_id, full_name, email, phone, active_church_id")
      .eq("auth_user_id", req.authUser.id)
      .single();

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    req.profile = profile;
    next();
  } catch (err) {
    return res.status(500).json({ message: "Profile error" });
  }
}
