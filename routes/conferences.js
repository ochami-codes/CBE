// routes/conferences.js
import express from "express";
import { supabaseAdmin } from "../supabaseClient.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("conferences")
      .select("id, name, conference_code")
      .order("name", { ascending: true });

    if (error) throw error;

    res.json({ conferences: data });
  } catch (err) {
    console.error("Conferences error:", err);
    res.status(500).json({
      message: "Failed to fetch conferences",
    });
  }
});

export default router;
