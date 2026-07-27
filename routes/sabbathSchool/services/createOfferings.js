import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function createOfferings({
  churchId,
  sessionId,
  groups = [],
}) {
  if (!sessionId) {
    throw createAppError("Attendance session is required.", 400, ERROR_CODES.INVALID_INPUT);
  }

  if (!Array.isArray(groups) || groups.length === 0) {
    throw createAppError(
      "At least one offering group is required.",
      400,
      ERROR_CODES.INVALID_INPUT
    );
  }

  const {
    rows: [session],
  } = await pool.query(
    `
    SELECT
      id
    FROM attendance_sessions
    WHERE id = $1
      AND church_id = $2
    `,
    [sessionId, churchId]
  );

  if (!session) {
    throw createAppError(
      "Attendance session not found.",
      404,
      ERROR_CODES.NOT_FOUND
    );
  }

  const { rows: existing } =
    await pool.query(
      `
      SELECT 1
      FROM attendance_group_totals
      WHERE session_id = $1
      LIMIT 1
      `,
      [sessionId]
    );

  if (existing.length > 0) {
    throw createAppError(
      "Offerings have already been recorded for this session.",
      409,
      ERROR_CODES.CONFLICT
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const group of groups) {
      if (!group.groupName) {
        throw createAppError(
          "Group name is required.",
          400,
          ERROR_CODES.INVALID_INPUT
        );
      }

      await client.query(
        `
        INSERT INTO attendance_group_totals (
          session_id,
          group_name,
          offering_amount
        )
        VALUES ($1, $2, $3)
        `,
        [
          sessionId,
          group.groupName,
          group.offeringAmount ?? 0,
        ]
      );
    }

    await client.query("COMMIT");

    return {
      sessionId,
      groupsRecorded: groups.length,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}