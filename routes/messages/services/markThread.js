import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function markThreadAsRead({
  threadId,
  profileId,
}) {
  if (!threadId) {
    throw createAppError("Thread is required.", 400, ERROR_CODES.INVALID_CREDENTIALS);
  }

  if (!profileId) {
    throw createAppError("User is required.", 400, ERROR_CODES.INVALID_CREDENTIALS);
  }

  await pool.query(
    `
    INSERT INTO thread_reads (
      thread_id,
      user_id,
      last_read_at
    )
    VALUES (
      $1,
      $2,
      NOW()
    )
    ON CONFLICT (
      thread_id,
      user_id
    )
    DO UPDATE
    SET last_read_at = NOW()
    `,
    [threadId, profileId]
  );

  return {
    success: true,
  };
}