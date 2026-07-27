import { pool } from "../../../db.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";
import { createAppError } from "../../../errors/AppError.js";

/* =========================================
   MY DEPARTMENT ANNOUNCEMENTS
========================================= */

export async function getMyDepartmentAnnouncements({
  profileId,
  churchId,
  limit,
}) {
  /* -----------------------------------------
     VALIDATE REQUIRED INPUTS
  ----------------------------------------- */

  if (!profileId) {
    throw createAppError(
      "Authentication required",
      401,
      ERROR_CODES.FORBIDDEN
    );
  }

  if (!churchId) {
    throw createAppError(
      "Church required.",
      400,
      ERROR_CODES.INVALID_CREDENTIALS
    );
  }

  /* -----------------------------------------
     VALIDATE LIMIT
  ----------------------------------------- */

  let parsedLimit = null;

  if (limit !== undefined && limit !== null) {
    parsedLimit = Number(limit);

    if (
      !Number.isInteger(parsedLimit) ||
      parsedLimit <= 0
    ) {
      throw createAppError(
        "Limit must be a positive integer.",
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }
  }

  /* -----------------------------------------
     BUILD QUERY
  ----------------------------------------- */

  const values = [
    profileId,
    churchId,
  ];

  let limitClause = "";

  if (parsedLimit !== null) {
    values.push(parsedLimit);

    limitClause = `
      LIMIT $${values.length}
    `;
  }

  /* -----------------------------------------
     FETCH ANNOUNCEMENTS
  ----------------------------------------- */
 const { rows } = await pool.query(
    `
    SELECT
      a.id,
      a.title,
      a.message,
      a.department_id,
      a.created_by,
      a.created_at

    FROM announcements a

    INNER JOIN member_departments md
      ON md.department_id = a.department_id

    INNER JOIN members m
      ON m.id = md.member_id

    WHERE
      m.profile_id = $1
      AND m.church_id = $2
      AND m.status = 'active'

      AND a.church_id = $2
      AND a.department_id IS NOT NULL

    ORDER BY
      a.created_at DESC

    ${limitClause}
    `,
    values
  );

  return rows;
}