import { pool } from "../../../db.js";
export const MembersService = {
  async getGivingSummary(churchId) {
    return pool.query(`
      SELECT
        m.id,
        m.full_name,
        COALESCE(SUM(t.amount),0) as total_given,
        MAX(t.transaction_date) as last_given
      FROM treasury_transactions t
      LEFT JOIN members m ON t.member_id = m.id
      WHERE t.church_id = ? AND t.type = 'income'
      GROUP BY m.id
    `, [churchId]);
  },

  async getMemberHistory(churchId, memberId) {
    return pool.query(`
      SELECT *
      FROM treasury_transactions
      WHERE church_id = ?
      AND member_id = ?
      ORDER BY transaction_date DESC
    `, [churchId, memberId]);
  },
};