import { pool } from "../../../db.js";
import { getEligibleTransactions } from "./remittance/getEligibleTransactions.js";
import { generateNumber } from "./remittance/generateNumber.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export const RemittanceService = {
  async getRemittances({
  churchId,
}) {
  const result = await pool.query(
    `
    SELECT
      r.id,
      r.remittance_number,
      r.remittance_date,
      r.status,
      r.total_amount,
      r.notes,

      COALESCE(
        json_agg(
          json_build_object(
            'id', ri.id,
            'fundId', f.id,
            'fundName', f.name,
            'amount', ri.amount
          )
          ORDER BY f.name
        ) FILTER (
          WHERE ri.id IS NOT NULL
        ),
        '[]'
      ) AS items

    FROM treasury_remittances r

    LEFT JOIN treasury_remittance_items ri
      ON ri.remittance_id = r.id

    LEFT JOIN treasury_funds f
      ON f.id = ri.fund_id

    WHERE r.church_id = $1

    GROUP BY
      r.id,
      r.remittance_number,
      r.remittance_date,
      r.status,
      r.total_amount,
      r.notes

    ORDER BY
      r.remittance_date DESC
    `,
    [churchId]
  );

  return result.rows;
},
async create({
  churchId,
  months,
  notes = null,
  profileId,
}) {
  const client =
    await pool.connect();

  try {
    await client.query("BEGIN");

    const transactions =
      await getEligibleTransactions({
        client,
        churchId,
        months,
      });
    if (transactions.length === 0) {
      throw createAppError(
        "No unremitted trust transactions found.",
        404,
        ERROR_CODES.NOT_FOUND
      );
    }

    const totalAmount =
      transactions.reduce(
        (sum, tx) =>
          sum + Number(tx.amount),
        0
      );

    const remittanceNumber =
      await generateNumber({
        client,
      });

    const remittanceResult =
      await client.query(
        `
        INSERT INTO treasury_remittances (
          church_id,
          remittance_number,
          remittance_date,
          status,
          total_amount,
          notes,
          recorded_by
        )
        VALUES (
          $1,
          $2,
          CURRENT_DATE,
          'remitted',
          $3,
          $4,
          $5
        )
        RETURNING id
        `,
        [
          churchId,
          remittanceNumber,
          totalAmount,
          notes,
          profileId,
        ]
      );

    const remittanceId =
      remittanceResult.rows[0].id;
    const values = [];
    const params = [];

    transactions.forEach(
      (tx, index) => {
        const offset =
          index * 4;

        values.push(
          `(
            gen_random_uuid(),
            $${offset + 1},
            $${offset + 2},
            $${offset + 3},
            $${offset + 4},
            NOW()
          )`
        );

        params.push(
          remittanceId,
          tx.id,
          tx.fundId,
          tx.amount
        );
      }
    );

    await client.query(
      `
      INSERT INTO treasury_remittance_items (
        id,
        remittance_id,
        transaction_id,
        fund_id,
        amount,
        created_at
      )
      VALUES
      ${values.join(",")}
      `,
      params
    );

    await client.query(
      `
      UPDATE treasury_transactions
      SET
        remittance_id = $1,
        updated_at = NOW()
      WHERE id = ANY($2::uuid[])
      `,
      [
        remittanceId,
        transactions.map(
          tx => tx.id
        ),
      ]
    );

    await client.query("COMMIT");

    return {
      id: remittanceId,
      remittanceNumber,
      totalAmount,
      transactionCount:
        transactions.length,
    };

  } catch (error) {

    await client.query(
      "ROLLBACK"
    );

    throw error;

  } finally {

    client.release();

  }
},
async cancel({
    remittanceId,
  }) {
    const client =
      await pool.connect();

    try {
      await client.query("BEGIN");

      const remittanceResult =
        await client.query(
          `
          SELECT
            id,
            status
          FROM treasury_remittances
          WHERE id = $1
          FOR UPDATE
          `,
          [remittanceId]
        );

      if (
        remittanceResult.rowCount === 0
      ) {
        throw createAppError(
          "Remittance not found.",
          404,
          ERROR_CODES.NOT_FOUND
        );
      }

      const remittance =
        remittanceResult.rows[0];

      if (
        remittance.status ===
        "cancelled"
      ) {
        throw createAppError(
          "Remittance has already been cancelled.",
          409,
          ERROR_CODES.CONFLICT
        );
      }

      await client.query(
        `
        UPDATE treasury_transactions
        SET
          remittance_id = NULL,
          updated_at = NOW()
        WHERE remittance_id = $1
        `,
        [remittanceId]
      );

      await client.query(
        `
        UPDATE treasury_remittances
        SET
          status = 'cancelled',
          updated_at = NOW()
        WHERE id = $1
        `,
        [remittanceId]
      );

      await client.query(
        "COMMIT"
      );

      return {
        id: remittanceId,
      };

    } catch (error) {

      await client.query(
        "ROLLBACK"
      );

      throw error;

    } finally {

      client.release();

    }
  },
}