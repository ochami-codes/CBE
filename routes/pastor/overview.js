// routes/admin/overview.js
import express from "express";

const router = express.Router();

router.get("/", async (req, res) => {
  const supabase = req.supabase;

  try {
    const { count: youth, error: youthError } = await supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("department", "youth");

    if (youthError) throw youthError;

    const { count: children, error: childrenError } = await supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("department", "children");

    if (childrenError) throw childrenError;

    res.json({
      youth: youth || 0,
      children: children || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
