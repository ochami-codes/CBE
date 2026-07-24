
import { pool } from "../../../db.js";

export async function getConferences() {
  const { rows } = await pool.query(
    `
    SELECT
      id,
      name,
      conference_code
    FROM conferences
    ORDER BY name;
    `
  );

  return {
    conferences: rows,
  };
}