import { pool } from "../../../../db.js";

export async function getFunds({
  churchId,
  departmentId,
}) {
  const values = [churchId];

  let whereClause = `
    WHERE
      f.church_id = $1
  `;

  if (departmentId) {
    values.push(departmentId);

    whereClause += `
      AND f.department_id = $${values.length}
    `;
  }

  const { rows } = await pool.query(
    `
    SELECT
      f.id,
      f.name,
      g.group_type,
      f.department_id,

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
      ) AS balance

    FROM treasury_funds f

    LEFT JOIN treasury_fund_groups g
      ON g.id = f.group_id

    LEFT JOIN treasury_transactions t
      ON t.fund_id = f.id

    ${whereClause}

    GROUP BY
      f.id,
      f.name,
      g.group_type,
      f.department_id

    ORDER BY
      g.group_type,
      f.name
    `,
    values
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    group_type: row.group_type,
    department_id: row.department_id,
    balance: Number(row.balance),
  }));
}