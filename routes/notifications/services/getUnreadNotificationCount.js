import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function getUnreadCount({
  profileId,
  churchId,
}) {
  if (!profileId) {
    throw createAppError("User is required.", 400, ERROR_CODES.INVALID_CREDENTIALS);
  }

  if (!churchId) {
    throw createAppError("Church is required.", 400, ERROR_CODES.INVALID_CREDENTIALS);
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