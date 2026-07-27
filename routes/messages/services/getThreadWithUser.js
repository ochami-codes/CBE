import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function getThreadWithUser({
  profileId,
  otherProfileId,
}) {
  if (!profileId) {
    throw createAppError("User is required.", 401, ERROR_CODES.AUTHENTICATION_REQUIRED);
  }

  if (!otherProfileId) {
    throw createAppError("Recipient is required.", 404, ERROR_CODES.NOT_FOUND);
  }

  const { rows } = await pool.query(
    `
    SELECT
      t.id AS thread_id

    FROM threads t

    JOIN thread_participants tp1
      ON tp1.thread_id = t.id

    JOIN thread_participants tp2
      ON tp2.thread_id = t.id

    WHERE
      t.type = 'direct'
      AND tp1.user_id = $1
      AND tp2.user_id = $2

    LIMIT 1
    `,
    [profileId, otherProfileId]
  );

  return {
    threadId: rows[0]?.thread_id ?? null,
    exists: rows.length > 0,
  };
}