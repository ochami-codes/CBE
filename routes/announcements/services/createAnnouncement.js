import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

/* ---------------------------------
   Create Church Announcement
---------------------------------- */

export async function createChurchAnnouncement({
  churchId,
  createdBy,
  payload,
}) {
  const { title, message } = payload;

  const { rows } = await pool.query(
    `
      INSERT INTO announcements (
        church_id,
        title,
        message,
        created_by
      )
      VALUES (
        $1,
        $2,
        $3,
        $4
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
      title.trim(),
      message.trim(),
      createdBy,
    ]
  );

  return rows[0];
}

/* ---------------------------------
   Create Department Announcement
---------------------------------- */

export async function createDepartmentAnnouncement({
  churchId,
  departmentId,
  createdBy,
  payload,
}) {
  const { title, message } = payload;
  if(!departmentId){ throw createAppError(
  "department is required",
  400,
  ERROR_CODES.MISSING_REQUIRED_FIELD
  );}

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