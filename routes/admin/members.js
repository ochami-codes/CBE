import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import requireAdmin from "../../middleware/requireAdmin.js";

const router = express.Router();

/**
 * GET /admin/members
 * Query params:
 *  - search
 *  - department
 *  - page
 *  - pageSize
 */
router.get(
  "/",
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    const supabase = req.supabase;
    const { church_id } = req.user;

    const {
      search = "",
      department = "",
      page = 1,
      pageSize = 10,
    } = req.query;

    const from = (page - 1) * pageSize;
    const to = from + Number(pageSize) - 1;

    try {
      let query = supabase
        .from("members")
        .select(
          `
          id,
          full_name,
          department,
          profiles (
            roles (
              name
            )
          )
        `,
          { count: "exact" }
        )
        .eq("church_id", church_id)
        .range(from, to);

      if (search) {
        query = query.ilike("full_name", `%${search}%`);
      }

      if (department) {
        query = query.eq("department", department);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const members = (data || []).map((m) => ({
        id: m.id,
        full_name: m.full_name,
        department: m.department,
        role_name: m.profiles?.roles?.name ?? "Member",
      }));

      res.json({
        members,
        total: count,
        page: Number(page),
        pageSize: Number(pageSize),
      });
    } catch (err) {
      console.error("GET /admin/members error:", err);
      res.status(500).json({
        message: "Failed to fetch members",
      });
    }
  }
);

export default router;
