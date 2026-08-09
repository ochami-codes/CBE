import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function updateChild({
  churchId,
  childId,
  payload,
  updatedBy,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const child = payload;

    if (!child || Object.keys(child).length === 0) {
      throw createAppError("No update data provided", 400, ERROR_CODES.INVALID_INPUT);
    }

    /* =========================
       VERIFY CHILD EXISTS
    ========================== */

    const existingChild = await client.query(
      `
      SELECT id
      FROM children
      WHERE id = $1
        AND church_id = $2
      LIMIT 1
      `,
      [childId, churchId]
    );

    if (existingChild.rows.length === 0) {
      throw createAppError(
        "Child not found in this church",
        404,
        ERROR_CODES.NOT_FOUND
      );
    }

    /* =========================
       BUILD UPDATE
    ========================== */

    const allowedFields = [
      "full_name",
      "date_of_birth",
      "gender",
      "dedication",
      "dedication_date",
      "notes",
    ];

    const updates = [];
    const values = [];

    let index = 1;

    for (const field of allowedFields) {
      if (child[field] === undefined) {
        continue;
      }

      updates.push(`${field} = $${index}`);
      values.push(
        child[field] === ""
          ? null
          : child[field]
      );

      index++;
    }

    if (updates.length === 0) {
      throw createAppError(
        "No valid fields to update",
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }

    /* =========================
       UPDATE CHILD
    ========================== */

    values.push(updatedBy);
    values.push(childId);
    values.push(churchId);

    const result = await client.query(
      `
      UPDATE children
      SET
        ${updates.join(", ")},
        updated_by = $${index++},
        updated_at = NOW()
      WHERE id = $${index++}
        AND church_id = $${index++}
      RETURNING *
      `,
      values
    );

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
