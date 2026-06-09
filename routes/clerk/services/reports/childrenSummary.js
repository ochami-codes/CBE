import { pool } from "../../../../db.js";

export async function getChildrenSummary({
  churchId,
  dateRange,
}) {
  const result =
    await pool.query(
      `
      SELECT
        COUNT(*) AS total_children,

        COUNT(*) FILTER (
          WHERE created_at
          BETWEEN $2 AND $3
        ) AS new_children,

        COUNT(*) FILTER (
          WHERE dedication = 'dedicated'
        ) AS dedicated,

        COUNT(*) FILTER (
          WHERE dedication = 'not_dedicated'
        ) AS not_dedicated,

        COUNT(*) FILTER (
          WHERE dedication = 'unknown'
        ) AS unknown

      FROM children
      WHERE church_id = $1
      `,
      [
        churchId,
        dateRange.start,
        dateRange.end,
      ]
    );

  const row =
    result.rows[0];

  return {
    total_children:
      Number(
        row.total_children
      ),

    new_children:
      Number(
        row.new_children
      ),

    dedicated:
      Number(
        row.dedicated
      ),

    not_dedicated:
      Number(
        row.not_dedicated
      ),

    unknown:
      Number(
        row.unknown
      ),
  };
}