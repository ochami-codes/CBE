import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function verifyThreadAccess({
  client,
  threadId,
  userId,
  churchId,
}) {
  const { rows } = await client.query(
    `
    SELECT 1
    FROM thread_participants tp
    JOIN threads t
      ON t.id = tp.thread_id
    WHERE tp.thread_id = $1
      AND tp.user_id = $2
      AND t.church_id = $3
    LIMIT 1
    `,
    [
      threadId,
      userId,
      churchId,
    ]
  );

  if (!rows.length) {
    throw createAppError("You are not a participant in this thread", 403, ERROR_CODES.FORBIDDEN);
  }
}