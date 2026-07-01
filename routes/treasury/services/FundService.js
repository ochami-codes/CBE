import { pool } from "../../../db.js";

export const FundsService = {
  async create({
  churchId,
  name,
  departmentId = null,
  category = null,
}) {
  /* Check for duplicate fund name */
  const duplicateResult = await pool.query(
    `
    SELECT id
    FROM treasury_funds
    WHERE church_id = $1
      AND LOWER(TRIM(name)) = LOWER(TRIM($2))
    LIMIT 1
    `,
    [churchId, name]
  );

  if (duplicateResult.rowCount > 0) {
    throw new Error(
      "A fund with this name already exists."
    );
  }

  /* Local Church Funds group */
  const groupResult = await pool.query(
    `
    SELECT id
    FROM treasury_fund_groups
    WHERE church_id = $1
      AND group_type = 'local'
    LIMIT 1
    `,
    [churchId]
  );

  if (groupResult.rowCount === 0) {
    throw new Error(
      "Local Church Funds group not found."
    );
  }

  const groupId = groupResult.rows[0].id;

  /* Generate a simple fund code */
  const fundCode = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_");

  const result = await pool.query(
    `
    INSERT INTO treasury_funds (
      church_id,
      group_id,
      department_id,
      fund_category,
      fund_code,
      name,
      requires_allocation,
      is_system,
      is_active,
      created_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6,
      false, false, true, NOW()
    )
    RETURNING *
    `,
    [
      churchId,
      groupId,
      departmentId,
      category,
      fundCode,
      name.trim(),
    ]
  );

  return result.rows[0];
},
async createFunds(client, {
  churchId,
  groupId,
  funds,
}) {
  const createdFunds = [];

  for (const fund of funds) {
    const result = await client.query(
      `
      INSERT INTO treasury_funds (
        church_id,
        group_id,
        fund_category,
        fund_code,
        name,
        is_system,
        is_active,
        created_at
      )
      VALUES (
        $1,$2,$3,$4,$5,true,true,NOW()
      )
      RETURNING id, fund_code
      `,
      [
        churchId,
        groupId,
        fund.category ?? null,
        fund.code,
        fund.name,
      ]
    );

    createdFunds.push(result.rows[0]);
  }

  return createdFunds;
},

  /**
   * Fetch treasury funds
   *
   * Filters:
   * group_id
   * group_type (local/trust)
   * department_id
   * active
   */
  async getFunds({
    churchId,
    groupId = null,
    groupType = null,
    departmentId = null,
    active = true,
  }) {


    const conditions = [
      "f.church_id = $1"
    ];


    const params = [
      churchId
    ];



    if (groupId) {

      params.push(groupId);

      conditions.push(
        `f.group_id = $${params.length}`
      );

    }



    if (groupType) {

      params.push(groupType);

      conditions.push(
        `g.group_type = $${params.length}`
      );

    }



    if (departmentId) {

      params.push(departmentId);

      conditions.push(
        `f.department_id = $${params.length}`
      );

    }



    if (active !== undefined) {

      params.push(active);

      conditions.push(
        `f.is_active = $${params.length}`
      );

    }




    const result =
      await pool.query(
        `
        SELECT
          f.id,
          f.name,
          f.group_id,
          f.department_id,
          f.fund_category,
          f.is_active,

          g.name AS group_name,
          g.group_type

        FROM treasury_funds f

        LEFT JOIN treasury_fund_groups g
          ON g.id = f.group_id

        WHERE ${conditions.join(" AND ")}

        ORDER BY f.name ASC
        `,
        params
      );


    return result.rows;

  },




async getSummary({ churchId }) {
  const [
    fundsResult,
    unremittedResult,
  ] = await Promise.all([
    pool.query(
      `
      SELECT
        f.id,
        f.name,
        g.group_type,
        f.department_id,

        COALESCE(
          SUM(
            CASE
              WHEN t.type = 'IN'
                THEN t.amount
              ELSE
                -t.amount
            END
          ),
          0
        ) AS balance

      FROM treasury_funds f

      LEFT JOIN treasury_fund_groups g
        ON g.id = f.group_id

      LEFT JOIN treasury_transactions t
        ON t.fund_id = f.id

      WHERE f.church_id = $1

      GROUP BY
        f.id,
        f.name,
        g.group_type,
        f.department_id

      ORDER BY
        g.group_type,
        f.name
      `,
      [churchId]
    ),

    pool.query(
      `
      SELECT
        DATE_TRUNC(
          'month',
          t.transaction_date
        )::date AS month,

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
    ),
  ]);

  const funds = fundsResult.rows.map(row => ({
    id: row.id,
    name: row.name,
    group_type: row.group_type,
    department_id: row.department_id,
    balance: Number(row.balance),
  }));

  const trustFunds = funds.filter(
    fund =>
      fund.group_type === "trust" &&
      fund.department_id === null
  );

  const localFunds = funds.filter(
    fund =>
      fund.group_type === "local" &&
      fund.department_id === null
  );

  const departmentFunds = funds.filter(
    fund => fund.department_id !== null
  );

  const sum = list =>
    list.reduce(
      (total, fund) => total + fund.balance,
      0
    );

  const trustBalance = sum(trustFunds);
  const localBalance = sum(localFunds);
  const departmentBalance = sum(departmentFunds);

  const unremittedMonths = Object.values(
    unremittedResult.rows.reduce(
      (groups, row) => {
        const key = row.month.toISOString();

        if (!groups[key]) {
          groups[key] = {
            month: row.month,
            total: 0,
            transactions: [],
          };
        }

        groups[key].total += Number(row.amount);

        groups[key].transactions.push({
          id: row.id,
          fundId: row.fund_id,
          fundName: row.fund_name,
          transactionDate:
            row.transaction_date,
          amount: Number(row.amount),
        });

        return groups;
      },
      {}
    )
  );

  return {
    summary: {
      overallBalance:
        trustBalance +
        localBalance +
        departmentBalance,

      trustBalance,
      localBalance,
      departmentBalance,

      pendingRemittance:
        unremittedMonths.reduce(
          (sum, month) => sum + month.total,
          0
        ),
    },

    trustFunds,
    localFunds,
    departmentFunds,

    unremittedMonths,
  }
}
}
