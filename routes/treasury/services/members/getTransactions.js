import { pool } from "../../../../db.js";

export async function getTransactions({
  churchId,
  memberId,
  periodFilter,
}) {

  const result = await pool.query(
    `
    SELECT
      t.id,
      t.transaction_date AS "date",
      t.amount,
      f.name AS "fund"

    FROM treasury_transactions t

    JOIN treasury_funds f
      ON f.id = t.fund_id

    WHERE
      t.church_id = $1
      AND t.member_id = $2
      AND t.type = 'IN'
      ${periodFilter}

    ORDER BY
      t.transaction_date DESC,
      t.id DESC
    `,
    [
      churchId,
      memberId,
    ]
  );

  return result.rows;

}