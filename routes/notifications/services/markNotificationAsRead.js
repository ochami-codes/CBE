import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function markNotificationAsRead({
  notificationId,
  profileId,
  churchId,
}) {
  if (!notificationId) {
    throw createAppError("Notification is required.", 400, ERROR_CODES.VALIDATION_ERROR);
  }

  if (!profileId) {
    throw createAppError("Failed to resolve user.", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }

  if (!churchId) {
    throw createAppError("Failed to resolve church", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
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
    throw createAppError("Notification not found.", 404, ERROR_CODES.NOT_FOUND);
  }

  return {
    success: true,
    message: "Notification marked as read.",
  };
}