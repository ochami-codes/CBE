import { pool } from "../../../db.js";

export async function markNotificationAsRead({
  notificationId,
  profileId,
  churchId,
}) {
  if (!notificationId) {
    throw new Error("Notification is required.");
  }

  if (!profileId) {
    throw new Error("User is required.");
  }

  if (!churchId) {
    throw new Error("Church is required.");
  }

  const { rows } = await pool.query(
    `
    UPDATE notifications
    SET
      is_read = true,
      read_at = NOW()
    WHERE id = $1
      AND user_id = $2
      AND church_id = $3
    RETURNING id;
    `,
    [
      notificationId,
      profileId,
      churchId,
    ]
  );

  if (rows.length === 0) {
    throw new Error("Notification not found.");
  }

  return {
    success: true,
    message: "Notification marked as read.",
  };
}