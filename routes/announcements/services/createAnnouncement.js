import { pool } from "../../../db.js";

export async function createAnnouncement({
  churchId,
  departmentId = null,
  createdBy,
  payload
}) {
  const { title, message } = payload;
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
      createdBy,
    ]
  );

  return rows[0];
}