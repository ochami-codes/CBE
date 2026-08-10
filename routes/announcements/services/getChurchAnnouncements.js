import { pool } from "../../../db.js";

/* =========================================
   CHURCH-WIDE ANNOUNCEMENTS
========================================= */

export async function getChurchAnnouncements({
  churchId,
  limit,
}) {
  const values = [churchId];

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

    WHERE church_id = $1
      AND department_id IS NULL

    ORDER BY created_at DESC

    ${limitClause}
    `,
    values
  );

  return rows;
}

/* =========================================
   DEPARTMENT ANNOUNCEMENTS
========================================= */

export async function getDepartmentAnnouncements({
  churchId,
  departmentId,
  limit,
}) {
  const values = [
    churchId,
    departmentId,
  ];

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

    WHERE church_id = $1
      AND department_id = $2

    ORDER BY created_at DESC

    ${limitClause}
    `,
    values
  );

  return rows;
}
