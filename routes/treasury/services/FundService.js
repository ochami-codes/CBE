import { pool } from "../../../db.js";

export const FundsService = {
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





  async getSummary({
    churchId,
    fundId,
  }) {


    const result =
      await pool.query(
        `
        SELECT

          COALESCE(
            SUM(
              CASE
                WHEN type='income'
                THEN amount
                ELSE 0
              END
            ),
            0
          ) AS income,


          COALESCE(
            SUM(
              CASE
                WHEN type='expense'
                THEN amount
                ELSE 0
              END
            ),
            0
          ) AS expenses


        FROM treasury_transactions

        WHERE church_id = $1
        AND fund_id = $2
        `,
        [
          churchId,
          fundId
        ]
      );


    const row =
      result.rows[0];


    const income =
      Number(row.income);


    const expenses =
      Number(row.expenses);



    return {

      income,

      expenses,

      balance:
        income - expenses,

    };

  },


};