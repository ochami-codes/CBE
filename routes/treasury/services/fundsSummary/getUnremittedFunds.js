import { pool } from "../../../../db.js";

export async function getUnremittedFunds(
  churchId
) {
  const { rows } = await pool.query(
    `
    SELECT
      TO_CHAR(
        t.transaction_date,
        'YYYY-MM'
      ) AS month,

      t.id,
      t.transaction_date,
      t.amount,

      f.id AS fund_id,
      f.name AS fund_name

    FROM treasury_transactions t

    JOIN treasury_funds f
      ON f.id = t.fund_id

    JOIN treasury_fund_groups g
      ON g.id = f.group_id

    WHERE
      f.church_id = $1
      AND g.group_type = 'trust'
      AND t.type = 'IN'
      AND t.remittance_id IS NULL

    ORDER BY
      month,
      t.transaction_date,
      f.name
    `,
    [churchId]
  );

  return rows;
}