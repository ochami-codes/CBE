import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function markAllNotificationsAsRead({
  profileId,
  churchId,
}) {
  if (!profileId) {
    throw createAppError("Failed to resolve user", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }

  if (!churchId) {
    throw createAppError("Failed to resolve church", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
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