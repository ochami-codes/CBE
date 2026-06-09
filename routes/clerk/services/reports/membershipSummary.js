import { pool } from "../../../../db.js";
import {countTransfersIn } from "../countTranferIn.js";
import {countTransfersOut}  from "../countTransferOut.js";
export async function getMembershipSummary({
  churchId,
  dateRange,
}) {
  const result =
    await pool.query(
      `
      SELECT
        COUNT(*) FILTER (
          WHERE created_at < $2
        ) AS opening_balance,

        COUNT(*) AS closing_balance,

        COUNT(*) FILTER (
          WHERE status = 'active'
        ) AS active_members,

        COUNT(*) FILTER (
          WHERE status = 'missing'
        ) AS missing_members,

        COUNT(*) FILTER (
          WHERE created_at
          BETWEEN $2 AND $3
        ) AS new_members

      FROM members
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

  const transfersIn =
    await countTransfersIn({
      churchId,
      dateRange,
    });

  const transfersOut =
    await countTransfersOut({
      churchId,
      dateRange,
    });

  const opening =
    Number(
      row.opening_balance
    );

  const closing =
    Number(
      row.closing_balance
    );

  return {
    opening_balance:
      opening,

    closing_balance:
      closing,

    total_members:
      closing,

    active_members:
      Number(
        row.active_members
      ),

    missing_members:
      Number(
        row.missing_members
      ),

    new_members:
      Number(
        row.new_members
      ),

    transfers_in:
      transfersIn,

    transfers_out:
      transfersOut,

    net_growth:
      closing - opening,
  };
}