import { pool } from "../../../db.js";

export async function markAllNotificationsAsRead({
  profileId,
  churchId,
}) {
  if (!profileId) {
    throw new Error("User is required.");
  }

  if (!churchId) {
    throw new Error("Church is required.");
  }

  const { rowCount } = await pool.query(
    `
    UPDATE notifications
    SET
      is_read = true,
      read_at = NOW()
    WHERE user_id = $1
      AND church_id = $2
      AND is_read = false;
    `,
    [
      profileId,
      churchId,
    ]
  );

  return {
    success: true,
    message: "All notifications marked as read.",
    updatedCount: rowCount,
  };
}