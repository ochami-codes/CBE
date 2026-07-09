import { pool } from "../../../db.js";

export async function getDepartments({
  churchId,
}) {
  const { rows } = await pool.query(
    `
    SELECT
      d.id,
      d.name,
      COUNT(*)::int AS member_count

    FROM member_departments md

    JOIN members m
      ON m.id = md.member_id

    JOIN departments d
      ON d.id = md.department_id

    WHERE m.church_id = $1

    GROUP BY
      d.id,
      d.name

    ORDER BY
      d.name;
    `,
    [churchId]
  );

  return rows.map((department) => ({
    id: department.id,
    name: department.name,
    memberCount: department.member_count,
  }));
}