// services/department.service.js

import { pool } from "../../../db.js";

export async function getDepartments({
  churchId,
}) {
  if (!churchId) {
    throw new Error("Church is required.");
  }

  const { rows } = await pool.query(
    `
    SELECT
      id,
      name,
      code,
      type
    FROM departments
    WHERE church_id = $1
    ORDER BY name;
    `,
    [churchId]
  );

  return {
    departments: rows,
  };
}