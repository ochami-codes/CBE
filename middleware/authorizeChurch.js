import { pool } from "../db.js";

export async function authorizeChurch(
  req,
  res,
  next
) {
  try {
    const profileId = req.user?.id;
    const churchId =
      req.user?.active_church_id;

    if (!profileId || !churchId) {
      return res.status(403).json({
        message:
          "Active church membership required.",
      });
    }

    const { rows } = await pool.query(
      `
      SELECT 1
      FROM members
      WHERE profile_id = $1
        AND church_id = $2
        AND status = 'active'
      LIMIT 1;
      `,
      [
        profileId,
        churchId,
      ]
    );

    if (!rows.length) {
      return res.status(403).json({
        message:
          "Active church membership required.",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}