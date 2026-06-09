import { pool } from "../../../../db.js";
export async function getChurchInfo(
  churchId
) {
  const result =
    await pool.query(
      `
      SELECT
        c.id,
        c.name,
        conf.name AS conference_name
      FROM churches c
      LEFT JOIN conferences conf
        ON conf.id = c.conference_id
      WHERE c.id = $1
      `,
      [churchId]
    );

  return result.rows[0];
}