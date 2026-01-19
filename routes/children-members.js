// routes/chidren-members.js
import express from "express";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

// GET all children for a church
router.get("/", async (req, res) => {
  const { churchId } = req.query;

  if (!churchId) return res.status(400).json({ error: "churchId is required" });

  try {
    const { data, error } = await supabase
      .from("children")
      .select("*")
      .eq("church_id", churchId)
      .order("full_name", { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single child by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from("children")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST – Add new child
router.post("/", async (req, res) => {
  const { full_name, parent_name, parent_phone, date_of_birth, gender, church_id } = req.body;

  if (!full_name || !parent_name || !parent_phone || !date_of_birth || !gender || !church_id) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const { data, error } = await supabase
      .from("children")
      .insert({
        full_name,
        parent_name,
        parent_phone,
        date_of_birth,
        gender,
        church_id
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT – Edit existing child
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { full_name, parent_name, parent_phone, date_of_birth, gender } = req.body;

  try {
    const { data, error } = await supabase
      .from("children")
      .update({ full_name, parent_name, parent_phone, date_of_birth, gender })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE – Remove child
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from("children")
      .delete()
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: "Child deleted successfully", data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
