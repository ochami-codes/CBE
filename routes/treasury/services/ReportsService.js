import { pool } from "../../../db.js";
export const ReportsService = {
  async monthly(churchId, month) {
    return pool.query(`
      SELECT
        fund_id,
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
      FROM treasury_transactions
      WHERE church_id = ?
      AND DATE_FORMAT(transaction_date,'%Y-%m') = ?
      GROUP BY fund_id
    `, [churchId, month]);
  },
};