import { pool } from "../../../db.js";

export async function createConference({
  name,
  conferenceCode,
}) {
  if (!name?.trim()) {
    throw new Error("Conference name is required.");
  }

  if (!conferenceCode?.trim()) {
    throw new Error("Conference code is required.");
  }

  const { rows } = await pool.query(
    `
    INSERT INTO conferences (
      name,
      conference_code
    )
    VALUES ($1, $2)
    RETURNING
      id,
      name,
      conference_code;
    `,
    [
      name.trim(),
      conferenceCode.trim().toUpperCase(),
    ]
  );

  return rows[0];
}