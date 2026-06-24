import { pool } from "../../../db.js";

export const FundGroupsService = {

  async getAll(churchId) {
    const result = await pool.query(
      `
      SELECT *
      FROM treasury_fund_groups
      WHERE church_id = $1
      `,
      [churchId]
    );

    return result.rows;
  },


  async createFundGroup(
    client,
    {
      churchId,
      name,
      description,
      groupType,
    }
  ) {

    const result = await client.query(
      `
      INSERT INTO treasury_fund_groups (
        church_id,
        name,
        description,
        group_type,
        created_at
      )

      VALUES (
        $1,
        $2,
        $3,
        $4,
        NOW()
      )

      RETURNING
        id,
        name,
        group_type
      `,
      [
        churchId,
        name,
        description || null,
        groupType,
      ]
    );


    return result.rows[0];
  },

};