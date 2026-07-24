import { pool } from "../../../db.js";

export async function getUnreadCount({
  profileId,
  churchId,
}) {
  if (!profileId) {
    throw new Error("User is required.");
  }

  if (!churchId) {
    throw new Error("Church is required.");
  }

  const { rows } = await pool.query(
    `
    SELECT
      COUNT(*)::int AS unread

    FROM notifications

    WHERE
      user_id = $1
      AND church_id = $2
      AND is_read = false
    `,
    [profileId, churchId]
  );

  return {
    unread: rows[0]?.unread ?? 0,
  };
}