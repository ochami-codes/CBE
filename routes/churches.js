import express from "express";

const router = express.Router();

/**
 * GET /churches
 * List, search and filter churches
 */
router.get("/", async (req, res) => {
  const supabase = req.supabase;

  const {
    search = "",
    conference_id,
    church_code,
    limit = 20,
    page = 1,
  } = req.query;

  try {
    let query = supabase
      .from("churches")
      .select(
        `
        id,
        name,
        church_code,
        logo,
        conference_id
      `,
        { count: "exact" }
      )
      .order("name", {
        ascending: true,
      });

    /* --------------------------
       FILTERS
    --------------------------- */

    if (conference_id) {
      query = query.eq(
        "conference_id",
        conference_id
      );
    }

    if (church_code) {
      query = query.eq(
        "church_code",
        church_code
      );
    }

    /* --------------------------
       SEARCH
    --------------------------- */

    if (search.trim()) {
      query = query.or(
        [
          `name.ilike.%${search.trim()}%`,
          `church_code.ilike.%${search.trim()}%`,
        ].join(",")
      );
    }

    /* --------------------------
       PAGINATION
    --------------------------- */

    const pageNumber =
      Number(page) || 1;

    const pageSize =
      Math.min(
        Number(limit) || 20,
        100
      );

    const from =
      (pageNumber - 1) *
      pageSize;

    const to =
      from + pageSize - 1;

    query = query.range(
      from,
      to
    );

    const {
      data,
      error,
      count,
    } = await query;

    if (error) throw error;

    return res.json({
      churches: data || [],
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total: count || 0,
        pages: Math.ceil(
          (count || 0) /
            pageSize
        ),
      },
    });
  } catch (err) {
    console.error(
      "Fetch churches error:",
      err
    );

    return res.status(500).json({
      message:
        "Failed to load churches",
    });
  }
});

/**
 * GET /churches/:id
 */
router.get("/:id", async (req, res) => {
  const supabase = req.supabase;
  const { id } = req.params;

  try {
    const { data, error } =
      await supabase
        .from("churches")
        .select("*")
        .eq("id", id)
        .single();

    if (error) throw error;

    return res.json(data);
  } catch (err) {
    console.error(
      "Fetch church by id error:",
      err
    );

    return res.status(500).json({
      message:
        "Failed to load church",
    });
  }
});

export default router;