import { pool } from "../../../db.js";
export const FundGroupsService = {
  async getAll(churchId) {
    return pool.query(
      `SELECT * FROM treasury_fund_groups WHERE church_id = ?`,
      [churchId]
    );
  },
};