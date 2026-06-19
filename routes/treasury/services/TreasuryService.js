import {pool} from "../../../db.js";

export const TreasuryService = {
  async getOverview({ churchId, start, end }) {
    const dateFilter =
      start && end
        ? `AND transaction_date BETWEEN '${start}' AND '${end}'`
        : "";

    const [tithe] = await pool.query(`
      SELECT COALESCE(SUM(amount),0) as total
      FROM treasury_transactions t
      JOIN treasury_funds f ON t.fund_id = f.id
      WHERE t.church_id = ? AND f.name = 'Tithe' ${dateFilter}
    `, [churchId]);

    const [offerings] = await pool.query(`
      SELECT COALESCE(SUM(amount),0) as total
      FROM treasury_transactions t
      JOIN treasury_funds f ON t.fund_id = f.id
      WHERE t.church_id = ?
      AND f.fund_category = 'general'
      AND t.type = 'income'
      ${dateFilter}
    `, [churchId]);

    const [expenses] = await pool.query(`
      SELECT COALESCE(SUM(amount),0) as total
      FROM treasury_transactions
      WHERE church_id = ? AND type = 'expense' ${dateFilter}
    `, [churchId]);

    const [balances] = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0)
        -
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0)
        as balance
      FROM treasury_transactions
      WHERE church_id = ? ${dateFilter}
    `, [churchId]);

    const [lastSabbath] = await pool.query(`
      SELECT SUM(amount) as total
      FROM treasury_transactions t
      WHERE t.church_id = ?
      AND t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    `, [churchId]);

    return {
      tithe: tithe.total,
      combined_offerings: offerings.total,
      expenses: expenses.total,
      balance: balances.balance,
      last_sabbath_tithe: lastSabbath.total,
    };
  },
};