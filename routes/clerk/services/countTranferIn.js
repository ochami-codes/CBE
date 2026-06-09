import { pool } from "../../../db.js";
export async function countTransfersIn({
  churchId,
  dateRange,
}) {
  const result =
    await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM transfers
      WHERE
        destination_church_id = $1
      AND status = 'completed'
      AND created_at
        BETWEEN $2 AND $3
      `,
      [
        churchId,
        dateRange.start,
        dateRange.end,
      ]
    );

  return Number(
    result.rows[0].total
  );
}