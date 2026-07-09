import { pool } from "../../../db.js";

export async function createAnnouncement({
  churchId,
  userId,
  payload
}) {
  const { title, message, department_id } = payload;
  const departmentId = department_id || null;
  const { rows } = await pool.query(
    `
    INSERT INTO announcements (
      church_id,
      department_id,
      title,
      message,
      created_by
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5
    )
    RETURNING
      id,
      church_id,
      department_id,
      title,
      message,
      created_by,
      created_at
    `,
    [
      churchId,
      departmentId,
      title.trim(),
      message.trim(),
      userId,
    ]
  );

  return rows[0];
}