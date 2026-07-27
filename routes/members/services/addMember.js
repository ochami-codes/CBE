import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function addMember({
  churchId,
  memberId,
  departmentId,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /* -------------------------
       Verify member
    ------------------------- */

    const memberResult =
      await client.query(
        `
        SELECT id
        FROM members
        WHERE
          id = $1
          AND church_id = $2
          AND status = 'active'
        `,
        [memberId, churchId]
      );

    if (!memberResult.rowCount) {
      throw createAppError(
        "Member not found.",
        404,
        ERROR_CODES.MEMBER_NOT_FOUND
      );
    }

    /* -------------------------
       Verify department
    ------------------------- */

    const departmentResult =
      await client.query(
        `
        SELECT id
        FROM departments
        WHERE
          id = $1
          AND church_id = $2
        `,
        [departmentId, churchId]
      );

    if (!departmentResult.rowCount) {
      throw createAppError(
        "Department not found.",
        404,
        ERROR_CODES.NOT_FOUND
      );
    }

    /* -------------------------
       Prevent duplicates
    ------------------------- */

    const existingResult =
      await client.query(
        `
        SELECT id
        FROM member_departments
        WHERE
          member_id = $1
          AND department_id = $2
        `,
        [memberId, departmentId]
      );

    if (existingResult.rowCount) {
      throw createAppError(
        "Member already belongs to this department.",
        409,
        ERROR_CODES.DUPLICATE_ENTRY

      );
    }

    /* -------------------------
       Assign member
    ------------------------- */

    const { rows } =
      await client.query(
        `
        INSERT INTO member_departments (
          member_id,
          department_id
        )
        VALUES ($1, $2)
        RETURNING *
        `,
        [
          memberId,
          departmentId,
        ]
      );

    await client.query("COMMIT");

    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}