import { pool } from "../../../db.js";

export async function updateConference(
  conferenceId,
  name,
  conferenceCode,
) {
  if (!conferenceId) {
    throw new Error("Conference is required.");
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
    throw new Error("Nothing to update.");
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
    throw new Error("Conference not found.");
  }

  return rows[0];
}