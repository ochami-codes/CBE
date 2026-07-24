// services/church.service.js

import { pool } from "../../../db.js";

export async function switchActiveChurch({
  profileId,
  churchId,
}) {
  if (!profileId) {
    throw new Error("User is required.");
  }

  if (!churchId) {
    throw new Error("Church is required.");
  }

  // Ensure the church exists
  const { rows: churchRows } = await pool.query(
    `
    SELECT id
    FROM churches
    WHERE id = $1;
    `,
    [churchId]
  );

  if (!churchRows.length) {
    throw new Error("Church not found.");
  }

  await pool.query(
    `
    UPDATE profiles
    SET active_church_id = $1
    WHERE id = $2;
    `,
    [churchId, profileId]
  );

  return {
    message: "Active church updated successfully.",
  };
}