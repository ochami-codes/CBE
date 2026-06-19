import { pool } from "../../../db.js";

export const TransactionsService = {
  async create({
    churchId,
    recordedBy,
    fund_id,
    amount,
    type,
    member_id,
    contributor_type,
    external_name,
    date,
  }) {
    const result = await pool.query(
      `
      INSERT INTO treasury_transactions (
        church_id,
        fund_id,
        amount,
        type,
        member_id,
        contributor_type,
        external_name,
        recorded_by,
        transaction_date
      )
      VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9
      )
      RETURNING *
      `,
      [
        churchId,
        fund_id,
        amount,
        type,
        member_id || null,
        contributor_type || "member",
        external_name || null,
        recordedBy,
        date
      ]
    );

    return result.rows[0];
  },

  async getAll({
    churchId,
    fundId,
    start,
    end,
  }) {
    const conditions = ["t.church_id = $1"];
    const params = [churchId];

    let paramIndex = 2;

    if (fundId) {
      conditions.push(`t.fund_id = $${paramIndex}`);
      params.push(fundId);
      paramIndex++;
    }

    if (start && end) {
      conditions.push(
        `t.transaction_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`
      );

      params.push(start, end);
      paramIndex += 2;
    }

    const result = await pool.query(
      `
      SELECT
        t.*,
        f.name AS fund_name,
        m.full_name AS member_name
      FROM treasury_transactions t
      JOIN treasury_funds f
        ON f.id = t.fund_id
      LEFT JOIN members m
        ON m.id = t.member_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY t.transaction_date DESC
      `,
      params
    );

    return result.rows;
  },
};