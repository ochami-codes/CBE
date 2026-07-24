import { pool } from "../../db.js";

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
    throw new Error("userId is required.");
  }

  if (!churchId) {
    throw new Error("churchId is required.");
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