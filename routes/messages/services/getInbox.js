import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function getInbox({
  profileId,
  churchId,
}) {
  if (!profileId) {
    throw createAppError("User is required.", 401, ERROR_CODES.AUTHENTICATION_REQUIRED);
  }

  if (!churchId) {
    throw createAppError("No active church selected.", 400, ERROR_CODES.INVALID_CREDENTIALS);
  }

  const { rows } = await pool.query(
    `
    SELECT
      t.id AS thread_id,
      t.type,
      t.role_name,

      m.content AS last_message,
      m.created_at AS last_message_at,

      p.id AS other_user_id,
      p.full_name AS other_user_name,

      COUNT(m2.id) FILTER (
        WHERE
          m2.created_at >
            COALESCE(
              tr.last_read_at,
              '1970-01-01'
            )
          AND m2.sender_id != $1
      ) AS unread_count

    FROM thread_participants tp

    JOIN threads t
      ON t.id = tp.thread_id

    LEFT JOIN messages m
      ON m.id = t.last_message_id

    LEFT JOIN thread_participants tp2
      ON tp2.thread_id = t.id
     AND tp2.user_id != $1

    LEFT JOIN profiles p
      ON p.id = tp2.user_id

    LEFT JOIN thread_reads tr
      ON tr.thread_id = t.id
     AND tr.user_id = $1

    LEFT JOIN messages m2
      ON m2.thread_id = t.id

    WHERE
      tp.user_id = $1
      AND t.church_id = $2

    GROUP BY
      t.id,
      t.type,
      t.role_name,
      m.id,
      p.id,
      p.full_name,
      tr.last_read_at

    ORDER BY
      t.last_message_at DESC NULLS LAST
    `,
    [profileId, churchId]
  );

  return rows;
}