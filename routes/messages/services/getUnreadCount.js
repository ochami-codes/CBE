import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function getUnreadCount({
  churchId,
  profileId,
}) {
  if (!churchId) {
    throw createAppError("Church is required.", 400, ERROR_CODES.INVALID_CREDENTIALS);
  }

  if (!profileId) {
    throw createAppError("User is required.", 400, ERROR_CODES.INVALID_CREDENTIALS);
  }

  const { rows } = await pool.query(
    `
    SELECT
      COUNT(m.id)::int AS count

    FROM messages m

    JOIN threads t
      ON t.id = m.thread_id

    JOIN thread_participants tp
      ON tp.thread_id = t.id
     AND tp.user_id = $1

    LEFT JOIN thread_reads tr
      ON tr.thread_id = t.id
     AND tr.user_id = $1

    WHERE
      t.church_id = $2
      AND m.sender_id <> $1
      AND m.created_at >
          COALESCE(
            tr.last_read_at,
            '1970-01-01'
          )
    `,
    [profileId, churchId]
  );

  return {
    count: rows[0]?.count ?? 0,
  };
}