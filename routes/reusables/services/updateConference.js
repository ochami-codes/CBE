import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function updateConference(
  conferenceId,
  name,
  conferenceCode,
) {
  if (!conferenceId) {
    throw createAppError("Conference is required.", 400, ERROR_CODES.INVALID_INPUT);
  }

  const updates = [];
  const values = [];

  if (name !== undefined) {
    values.push(name.trim());
    updates.push(`name = $${values.length}`);
  }

  if (conferenceCode !== undefined) {
    values.push(
      conferenceCode.trim().toUpperCase()
    );
    updates.push(
      `conference_code = $${values.length}`
    );
  }

  if (!updates.length) {
    throw createAppError("Nothing to update.", 409, ERROR_CODES.CONFLICT);
  }

  values.push(conferenceId);

  const { rows } = await pool.query(
    `
    UPDATE conferences
    SET ${updates.join(", ")}
    WHERE id = $${values.length}
    RETURNING
      id,
      name,
      conference_code;
    `,
    values
  );

  if (!rows.length) {
    throw createAppError("Conference not found.", 404, ERROR_CODES.NOT_FOUND);
  }

  return rows[0];
}