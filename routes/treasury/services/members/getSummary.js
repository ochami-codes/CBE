import { pool } from "../../../../db.js";

export async function getSummary({
  churchId,
  memberId,
  periodFilter,
}) {

  const result = await pool.query(
    `
    WITH filtered_transactions AS (

      SELECT
        t.amount,
        t.fund_id,
        f.name AS fund_name

      FROM treasury_transactions t

      JOIN treasury_funds f
        ON f.id = t.fund_id

      WHERE
        t.church_id = $1
        AND t.member_id = $2
        AND t.type = 'IN'
        ${periodFilter}

    )

    SELECT

      COUNT(*) AS contributions,

      COALESCE(
        SUM(amount),
        0
      ) AS total_giving,

      COALESCE(
        SUM(
          CASE
           WHEN LOWER(fund_name) = 'tithe'
            THEN amount
            ELSE 0
          END
        ),
        0
      ) AS total_tithe,

      COALESCE(
        (
          SELECT json_agg(funds)
          FROM (

            SELECT
              fund_id,
              fund_name,
              SUM(amount) AS total

            FROM filtered_transactions

            GROUP BY
              fund_id,
              fund_name

            ORDER BY
              fund_name

          ) funds
        ),
        '[]'::json
      ) AS fund_totals

    FROM filtered_transactions
    `,
    [
      churchId,
      memberId,
    ]
  );

  const row = result.rows[0];

  return {
    contributions: Number(
      row.contributions
    ),
    totalGiving: Number(
      row.total_giving
    ),
    totalTithe: Number(
      row.total_tithe
    ),
    fundTotals: row.fund_totals,
  };

}