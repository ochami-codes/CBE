import { pool } from "../../../db.js";

export async function getMembers({
  churchId,
  search = "",
  departmentId,
}) {
  const values = [churchId];

  let whereClause = `
    WHERE
      m.church_id = $1
      AND m.status = 'active'
  `;

  if (search?.trim()) {
    values.push(`%${search.trim()}%`);

    whereClause += `
      AND (
        p.full_name ILIKE $${values.length}
        OR p.phone ILIKE $${values.length}
      )
    `;
  }

  if (departmentId) {
    values.push(departmentId);

    whereClause += `
      AND EXISTS (
        SELECT 1
        FROM member_departments md
        WHERE
          md.member_id = m.id
          AND md.department_id = $${values.length}
      )
    `;
  }

  const { rows } = await pool.query(
    `
    SELECT
      m.id,
      m.status,
      m.created_at,

      p.id AS profile_id,
      p.full_name,
      p.phone,
      p.gender,
      p.is_system_user,

      COALESCE(
        ARRAY_AGG(
          DISTINCT d.name
        ) FILTER (
          WHERE d.id IS NOT NULL
        ),
        '{}'
      ) AS departments,

      COALESCE(
        ARRAY_AGG(
          DISTINCT r.name
        ) FILTER (
          WHERE r.id IS NOT NULL
        ),
        '{}'
      ) AS roles

    FROM members m

    JOIN profiles p
      ON p.id = m.profile_id

    LEFT JOIN member_departments md
      ON md.member_id = m.id

    LEFT JOIN departments d
      ON d.id = md.department_id

    LEFT JOIN member_roles mr
      ON mr.member_id = m.id

    LEFT JOIN roles r
      ON r.id = mr.role_id

    ${whereClause}

    GROUP BY
      m.id,
      p.id

    ORDER BY
      p.full_name ASC
    `,
    values
  );

  return rows.map((member) => ({
    id: member.id,
    profileId: member.profile_id,

    full_name: member.full_name,
    phone: member.phone,
    gender: member.gender,

    is_system_user: member.is_system_user,

    departments: member.departments,
    roles: member.roles,

    primary_role:
      member.roles[0] ?? "member",

    status: member.status,
    active: member.status === "active",

    created_at: member.created_at,
  }));
}