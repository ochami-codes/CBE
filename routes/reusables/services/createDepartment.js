import { pool } from "../../../db.js";

export async function createDepartment({
  churchId,
  name,
  code,
  type = null,
}) {
  if (!churchId) {
    throw new Error("Church is required.");
  }

  if (!name?.trim()) {
    throw new Error("Department name is required.");
  }

  if (!code?.trim()) {
    throw new Error("Department code is required.");
  }

  const { rows } = await pool.query(
    `
    INSERT INTO departments (
      church_id,
      name,
      code,
      type
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
      name,
      code,
      type;
    `,
    [
      churchId,
      name.trim(),
      code.trim().toUpperCase(),
      type?.trim() ?? null,
    ]
  );

  return rows[0];
}