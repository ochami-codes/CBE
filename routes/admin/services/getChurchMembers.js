import { pool } from "../../../db.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";
import { createAppError } from "../../../errors/AppError.js";
export async function getChurchMembers({ churchId }) {
  
 if (!churchId) {
    throw createAppError(
      "Church is required.",
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD
    );
  }

  const { rows } = await pool.query(
    `
    SELECT
      m.id,
      p.full_name,
      m.status,

      COALESCE(
        ARRAY_AGG(DISTINCT d.name)
        FILTER (WHERE d.id IS NOT NULL),
        '{}'
      ) AS departments,

      COALESCE(
        ARRAY_AGG(DISTINCT r.name)
        FILTER (WHERE r.id IS NOT NULL),
        '{}'
      ) AS roles

    FROM members m

    JOIN profiles p
      ON p.id = m.profile_id
      AND p.auth_user_id IS NOT NULL

    LEFT JOIN member_departments md
      ON md.member_id = m.id

    LEFT JOIN departments d
      ON d.id = md.department_id

    LEFT JOIN member_roles mr
      ON mr.member_id = m.id

    LEFT JOIN roles r
      ON r.id = mr.role_id

    WHERE m.church_id = $1

    GROUP BY
      m.id,
      p.full_name,
      m.status

    ORDER BY p.full_name;
    `,
    [churchId]
  );

  return rows;
}