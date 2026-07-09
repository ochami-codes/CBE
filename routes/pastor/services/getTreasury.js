import { pool } from "../../../db.js";

export async function getTreasury({
  churchId,
}) {
  const { rows } = await pool.query(
    `
    SELECT
      COALESCE(
        SUM(
          CASE
            WHEN t.type = 'IN'
            THEN t.amount
            ELSE 0
          END
        ),
        0
      ) AS total_giving,

      COALESCE(
        SUM(
          CASE
            WHEN g.group_type = 'trust'
             AND f.fund_code = 'TITHE'
             AND t.type = 'IN'
            THEN t.amount
            ELSE 0
          END
        ),
        0
      ) AS total_tithe,

      COALESCE(
        SUM(
          CASE
            WHEN g.group_type = 'local'
             AND t.type = 'IN'
            THEN t.amount
            WHEN g.group_type = 'local'
             AND t.type = 'OUT'
            THEN -t.amount
            ELSE 0
          END
        ),
        0
      ) AS local_funds,

      COALESCE(
        SUM(
          CASE
            WHEN g.group_type = 'trust'
             AND t.type = 'IN'
             AND t.remittance_id IS NULL
            THEN t.amount
            WHEN g.group_type = 'trust'
             AND t.type = 'OUT'
            THEN -t.amount
            ELSE 0
          END
        ),
        0
      ) AS trust_funds

    FROM treasury_transactions t

    JOIN treasury_funds f
      ON f.id = t.fund_id

    JOIN treasury_fund_groups g
      ON g.id = f.group_id

    WHERE t.church_id = $1
    `,
    [churchId]
  );

  const treasury = rows[0];

  return {
    totalGiving: Number(
      treasury.total_giving
    ),
    totalTithe: Number(
      treasury.total_tithe
    ),
    localFunds: Number(
      treasury.local_funds
    ),
    trustFunds: Number(
      treasury.trust_funds
    ),
  };
}