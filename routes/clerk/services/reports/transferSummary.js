import {pool} from "../../../../db.js";
export async function getTransferSummary({
  churchId,
}) {
  const result =
    await pool.query(
      `
      SELECT
        COUNT(*) FILTER (
          WHERE status = 'requested'
        ) AS pending,

        COUNT(*) FILTER (
          WHERE status = 'pending_destination'
        ) AS pending_destination,

        COUNT(*) FILTER (
          WHERE status = 'rejected'
        ) AS rejected,

        COUNT(*) FILTER (
          WHERE status = 'completed'
        ) AS completed

      FROM transfers
      WHERE
        source_church_id = $1
        OR destination_church_id = $1
      `,
      [churchId]
    );

  const row =
    result.rows[0];

  return {
    pending:
      Number(row.pending),

    pending_destination:
      Number(
        row.pending_destination
      ),

    rejected:
      Number(row.rejected),

    completed:
      Number(row.completed),
  };
}