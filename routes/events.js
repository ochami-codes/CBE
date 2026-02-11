// backend/routes/events.js
import express from "express";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

/**
 * GET /events
 * List events for the authenticated user's church
 */
router.get("/", async (req, res) => {
  const supabase = req.supabase;
  const { church_id } = req.user;

  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("church_id", church_id)
      .order("date", { ascending: true });

    if (error) throw error;

    res.json({ events: data });
  } catch (err) {
    console.error("Fetch events error:", err);
    res.status(500).json({
      error: "Failed to fetch events",
    });
  }
});

/**
 * POST /events
 * Create event (admin / pastor / elder)
 */
router.post(
  "/",
  
  requireRole(["admin", "pastor", "elder"]),
  async (req, res) => {
    const supabase = req.supabase;
    const { church_id } = req.user;
    const { title, date, description } = req.body;

    if (!title || !date) {
      return res.status(400).json({
        error: "Title and date are required",
      });
    }

    try {
      const { data, error } = await supabase
        .from("events")
        .insert({
          title,
          description: description || null,
          date,
          church_id,
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({
        message: "Event created successfully",
        event: data,
      });
    } catch (err) {
      console.error("Create event error:", err);
      res.status(500).json({
        error: "Failed to create event",
      });
    }
  }
);

export default router;
