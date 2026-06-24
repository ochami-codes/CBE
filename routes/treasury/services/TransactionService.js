import { pool } from "../../../db.js";

export const TransactionsService = {

  async create({
    churchId,
    recordedBy,

    fund_id,
    amount,
    type,

    // income
    member_id,
    contributor_type,
    contributor_name,
    contributor_phone,

    // expense
    expense_category,
    payee_name,
    payment_method,

    notes,
    date,
  }) {

    const client =
      await pool.connect();


    try {

      await client.query("BEGIN");


      /*
        Create original transaction
      */
      const result =
        await client.query(
          `
          INSERT INTO treasury_transactions (

            church_id,
            fund_id,
            amount,
            type,

            member_id,
            contributor_type,
            contributor_name,
            contributor_phone,

            expense_category,
            payee_name,
            payment_method,

            notes,

            recorded_by,
            transaction_date,
            recorded_at

          )

          VALUES (
            $1,$2,$3,$4,
            $5,$6,$7,$8,
            $9,$10,$11,
            $12,$13,
            $14,NOW()
          )

          RETURNING *
          `,
          [
            churchId,
            fund_id,
            amount,
            type,

            member_id || null,
            contributor_type || null,
            contributor_name || null,
            contributor_phone || null,

            expense_category || null,
            payee_name || null,
            payment_method || null,

            notes || null,

            recordedBy,
            date,
          ]
        );


      const transaction =
        result.rows[0];




      /*
        Only income can split
      */
      if (type === "IN") {


        const allocationResult =
          await client.query(
            `
            SELECT
              target_fund_id,
              percentage

            FROM treasury_fund_allocations

            WHERE source_fund_id = $1
            `,
            [fund_id]
          );



        for (
          const allocation
          of allocationResult.rows
        ) {


          const allocatedAmount =
            Number(amount) *
            (
              Number(allocation.percentage)
              / 100
            );



          /*
            Create ledger entry
            for target fund
          */
          const child =
            await client.query(
              `
              INSERT INTO treasury_transactions (

                church_id,
                fund_id,
                amount,
                type,

                notes,

                recorded_by,
                transaction_date,
                recorded_at,

                parent_transaction_id

              )

              VALUES (

                $1,$2,$3,$4,

                $5,

                $6,$7,NOW(),

                $8

              )

              RETURNING id

              `,
              [
                churchId,

                allocation.target_fund_id,

                allocatedAmount,

                "IN",

                `Allocation from transaction ${transaction.id}`,

                recordedBy,

                date,

                transaction.id,
              ]
            );



          /*
            Save allocation history
          */
          await client.query(
            `
            INSERT INTO treasury_allocations (

              transaction_id,

              allocated_transaction_id,

              target_fund_id,

              percentage,

              amount,

              created_at

            )

            VALUES (
              $1,$2,$3,$4,$5,NOW()
            )

            `,
            [
              transaction.id,

              child.rows[0].id,

              allocation.target_fund_id,

              allocation.percentage,

              allocatedAmount,
            ]
          );


        }

      }



      await client.query("COMMIT");


      return transaction;


    } catch(error) {

      await client.query(
        "ROLLBACK"
      );

      throw error;


    } finally {

      client.release();

    }

  },

  async getAll({
  churchId,
  fundId,
  type,
  start,
  end,
}) {

  const conditions = [
    "t.church_id = $1",
    "t.parent_transaction_id IS NULL",
  ];

  const params = [churchId];

  let index = 2;


  if (fundId) {

    conditions.push(
      `t.fund_id = $${index}`
    );

    params.push(fundId);

    index++;

  }


  if (type) {

    conditions.push(
      `t.type = $${index}`
    );

    params.push(type);

    index++;

  }


  if (start) {

    conditions.push(
      `t.transaction_date >= $${index}`
    );

    params.push(start);

    index++;

  }


  if (end) {

    conditions.push(
      `t.transaction_date <= $${index}`
    );

    params.push(end);

    index++;

  }


  const result =
    await pool.query(
      `
      SELECT

        t.id,
        t.transaction_date,
        t.amount,
        t.type,

        t.notes,

        t.expense_category,
        t.payee_name,
        t.payment_method,

        t.contributor_type,
        t.contributor_name,
        t.contributor_phone,

        f.name AS fund_name,

        member_profile.full_name
          AS member_name,

        recorder_profile.full_name
          AS recorded_by_name

      FROM treasury_transactions t

      JOIN treasury_funds f
        ON f.id = t.fund_id

      LEFT JOIN members m
        ON m.id = t.member_id

      LEFT JOIN profiles member_profile
        ON member_profile.id = m.profile_id

      LEFT JOIN profiles recorder_profile
        ON recorder_profile.id = t.recorded_by

      WHERE ${conditions.join(" AND ")}

      ORDER BY
        t.transaction_date DESC,
        t.recorded_at DESC
      `,
      params
    );


  const summary =
    await this.getTodaySummary({
      churchId,
    });


  return {

    transactions:
      result.rows,

    summary,

  };

},



async getTodaySummary({
  churchId,
}) {

  const result =
    await pool.query(
      `
      SELECT

        COUNT(*) AS today_count,

        COALESCE(
          SUM(
            CASE
              WHEN type = 'IN'
              THEN amount
              ELSE 0
            END
          ),
          0
        ) AS today_recorded,

        COALESCE(
          SUM(
            CASE
              WHEN type = 'OUT'
              THEN amount
              ELSE 0
            END
          ),
          0
        ) AS today_expenses

      FROM treasury_transactions

      WHERE church_id = $1
      AND parent_transaction_id IS NULL
      AND transaction_date = CURRENT_DATE
      `,
      [churchId]
    );

  const row =
    result.rows[0];

  return {

    today_count:
      Number(row.today_count),

    today_recorded:
      Number(row.today_recorded),

    today_expenses:
      Number(row.today_expenses),

  };

},
}