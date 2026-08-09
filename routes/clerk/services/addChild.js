import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function addChild({
  churchId,
  payload,
  createdBy,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      parent_member_id,
      child,
    } = payload;

    const {
      full_name,
      date_of_birth,
      gender,
      dedication,
      dedication_date,
      notes,
    } = child;

    if (!full_name) {
      throw createAppError("Child full name is required", 400, ERROR_CODES.MISSING_REQUIRED_FIELD);
    }

    /* =========================
       1. VALIDATE PARENT
    ========================== */

    const parentCheck = await client.query(
      `
      SELECT id
      FROM members
      WHERE id = $1
        AND church_id = $2
      LIMIT 1
      `,
      [parent_member_id, churchId]
    );

    if (parentCheck.rows.length === 0) {
      throw createAppError("Parent member not found in this church", 404, ERROR_CODES.NOT_FOUND);
    }

    /* =========================
       2. DUPLICATE CHECK
    ========================== */

    const duplicateCheck = await client.query(
      `
      SELECT id
      FROM children
      WHERE church_id = $1
        AND LOWER(full_name) = LOWER($2)
        AND date_of_birth = $3
      LIMIT 1
      `,
      [churchId, full_name, date_of_birth]
    );

    if (duplicateCheck.rows.length > 0) {
      throw createAppError("Child already exists in this church", 409, ERROR_CODES.ALREADY_EXISTS);
    }

    /* =========================
       3. INSERT CHILD
    ========================== */

    const result = await client.query(
      `
      INSERT INTO children (
        full_name,
        parent_id,
        date_of_birth,
        gender,
        dedication,
        dedication_date,
        notes,
        church_id,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [
        full_name,
        parent_member_id,
        date_of_birth,
        gender,
        dedication ?? "unknown",
        dedication_date || null,
        notes || null,
        churchId,
        createdBy,
      ]
    );

    await client.query("COMMIT");

    return { child: result.rows[0] };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
