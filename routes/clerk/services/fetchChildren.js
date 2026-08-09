import { pool } from "../../../db.js";

export async function fetchChildren(churchId) {
  const result = await pool.query(
    `
    SELECT
      c.id,
      c.full_name,
      c.date_of_birth,
      c.gender,
      c.department,

      c.dedication,
      c.dedication_date,
      c.notes,

      c.created_at,
      c.updated_at,

      m.id AS parent_member_id,

      p.full_name AS parent_name,
      p.phone AS parent_phone,
      p.email AS parent_email,

      COALESCE(status_log.new_status, 'active') AS status

    FROM children c

    LEFT JOIN members m
      ON m.id = c.parent_id

    LEFT JOIN profiles p
      ON p.id = m.profile_id

    LEFT JOIN LATERAL (
      SELECT
        l.new_status
      FROM child_status_logs l
      WHERE l.child_id = c.id
      ORDER BY l.created_at DESC
      LIMIT 1
    ) status_log ON TRUE

    WHERE c.church_id = $1

    ORDER BY c.full_name ASC
    `,
    [churchId]
  );

  return result.rows;
}

