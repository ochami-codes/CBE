import { pool } from "../../../db.js";

export async function getMyProfile({profileId}) {
  if (!profileId) {
    throw new Error("Profile is required.");
  }

  const { rows } = await pool.query(
    `
    SELECT
      id,
      full_name,
      phone,
      email,
      active_church_id
    FROM profiles
    WHERE id = $1
    LIMIT 1;
    `,
    [profileId]
  );

  if (!rows.length) {
    throw new Error("Profile not found.");
  }

  return rows[0];
}