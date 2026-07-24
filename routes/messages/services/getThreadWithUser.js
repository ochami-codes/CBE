import { pool } from "../../../db.js";

export async function getThreadWithUser({
  profileId,
  otherProfileId,
}) {
  if (!profileId) {
    throw new Error("User is required.");
  }

  if (!otherProfileId) {
    throw new Error("Recipient is required.");
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