import { pool } from "../../../db.js";

export async function getOverview({
  churchId,
}) {
  const { rows } = await pool.query(
    `
    SELECT
      (
        SELECT COUNT(*)
        FROM members
        WHERE church_id = $1
      ) AS total_members,

      (
        SELECT COUNT(*)
        FROM children
        WHERE church_id = $1
      ) AS total_children,

      (
        SELECT COUNT(*)
        FROM departments
        WHERE church_id = $1
      ) AS total_departments,

      (
  SELECT
    COALESCE(
      SUM(
        CASE
          WHEN g.group_type = 'trust'
           AND t.type = 'IN'
           AND t.remittance_id IS NULL
          THEN t.amount

          WHEN g.group_type <> 'trust'
           AND t.type = 'IN'
          THEN t.amount

          WHEN t.type = 'OUT'
          THEN -t.amount

          ELSE 0
        END
      ),
      0
    )
  FROM treasury_transactions t
  JOIN treasury_funds f
    ON f.id = t.fund_id
  JOIN treasury_fund_groups g
    ON g.id = f.group_id
  WHERE t.church_id = $1
) AS total_funds
    `,
    [churchId]
  );

  const overview = rows[0];

  return {
    totalMembers: Number(
      overview.total_members
    ),

    totalChildren: Number(
      overview.total_children
    ),

    totalDepartments: Number(
      overview.total_departments
    ),

    totalFunds: Number(
      overview.total_funds
    ),
  };
}