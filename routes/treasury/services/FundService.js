import { pool } from "../../../db.js";

export const FundsService = {

  /**
   * Dropdown funds
   * Optional filters:
   * group_id
   * department_id
   * active
   */
  async getFunds({
    churchId,
    groupId,
    departmentId,
    active = true,
  }) {

    let query = `
      SELECT
        id,
        name,
        group_id,
        department_id,
        fund_category,
        is_active
      FROM treasury_funds
      WHERE church_id = $1
    `;

    const params = [churchId];


    if (groupId) {

      params.push(groupId);

      query += `
        AND group_id = $${params.length}
      `;

    }


    if (departmentId) {

      params.push(departmentId);

      query += `
        AND department_id = $${params.length}
      `;

    }


    if (active) {

      query += `
        AND is_active = true
      `;

    }


    query += `
      ORDER BY name ASC
    `;


    const result =
      await pool.query(
        query,
        params
      );


    return result.rows;
  },



  async getSummary({
    churchId,
    fundId,
  }) {


    const incomeResult =
      await pool.query(
        `
        SELECT
          COALESCE(
            SUM(amount),
            0
          ) AS total

        FROM treasury_transactions

        WHERE church_id = $1
        AND fund_id = $2
        AND type = 'income'
        `,
        [
          churchId,
          fundId,
        ]
      );



    const expenseResult =
      await pool.query(
        `
        SELECT
          COALESCE(
            SUM(amount),
            0
          ) AS total

        FROM treasury_transactions

        WHERE church_id = $1
        AND fund_id = $2
        AND type = 'expense'
        `,
        [
          churchId,
          fundId,
        ]
      );



    const income =
      Number(
        incomeResult.rows[0].total
      );


    const expense =
      Number(
        expenseResult.rows[0].total
      );


    return {

      income,

      expense,

      balance:
        income - expense,

    };
  },


};