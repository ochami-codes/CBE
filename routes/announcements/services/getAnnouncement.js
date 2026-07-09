import { pool } from "../../../db.js";

export async function getAnnouncements({
  churchId,
  departmentId = null,
  limit,
}) {
  const values = [churchId];

  let whereClause = `
    WHERE
      church_id = $1
  `;

  if (departmentId) {
    values.push(departmentId);

    whereClause += `
      AND department_id = $${values.length}
    `;
  } else {
    // Church-wide announcements only
    whereClause += `
      AND department_id IS NULL
    `;
  }

  let limitClause = "";

  if (Number.isFinite(Number(limit))) {
    values.push(Number(limit));

    limitClause = `
      LIMIT $${values.length}
    `;
  }

  const { rows } = await pool.query(
    `
    SELECT
      id,
      title,
      message,
      department_id,
      created_by,
      created_at

    FROM announcements

    ${whereClause}

    ORDER BY
      created_at DESC

    ${limitClause}
    `,
    values
  );

  return rows;
}