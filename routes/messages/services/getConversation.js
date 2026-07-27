import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function getConversation({
  threadId,
  profileId,
}) {
  if (!threadId) {
    throw createAppError("Thread is required.", 400, ERROR_CODES.INVALID_CREDENTIALS);
  }

  if (!profileId) {
    throw createAppError("User is required.", 401, ERROR_CODES.AUTHENTICATION_REQUIRED);
  }

  const { rows } = await pool.query(
    `
    SELECT
      m.id,
      m.content,
      m.created_at,
      m.sender_id,

      CASE
        WHEN tr.last_read_at >= m.created_at
        THEN true
        ELSE false
      END AS is_read,

      p.full_name

    FROM messages m

    JOIN profiles p
      ON p.id = m.sender_id

    LEFT JOIN thread_reads tr
      ON tr.thread_id = m.thread_id
     AND tr.user_id = $2

    WHERE
      m.thread_id = $1
      AND EXISTS (
        SELECT 1
        FROM thread_participants tp
        WHERE tp.thread_id = m.thread_id
          AND tp.user_id = $2
      )

    ORDER BY
      m.created_at ASC
    `,
    [threadId, profileId]
  );

  return rows;
}