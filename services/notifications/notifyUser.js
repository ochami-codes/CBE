import { pool } from "../../db.js";
import { createAppError } from "../../errors/AppError.js";
import { ERROR_CODES } from "../../errors/errorCodes.js";

export async function notifyUser({
  client,
  userId,
  churchId,
  type,
  title,
  message,
  relatedId = null,
  relatedType = null,
}) {
  if (!userId) {
    throw createAppError("userId is required.", 400, ERROR_CODES.INVALID_CREDENTIALS);
  }

  if (!churchId) {
    throw createAppError("churchId is required.", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }

  const db = client ?? pool;

  await db.query(
    `
    INSERT INTO notifications (
      user_id,
      church_id,
      type,
      title,
      message,
      related_id,
      related_type,
      is_read,
      created_at
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      false,
      NOW()
    );
    `,
    [
      userId,
      churchId,
      type,
      title,
      message,
      relatedId,
      relatedType,
    ]
  );
}