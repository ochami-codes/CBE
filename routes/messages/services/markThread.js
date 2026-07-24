import { pool } from "../../../db.js";

export async function markThreadAsRead({
  threadId,
  profileId,
}) {
  if (!threadId) {
    throw new Error("Thread is required.");
  }

  if (!profileId) {
    throw new Error("User is required.");
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