import { pool } from "../../../db.js";

export const TreasuryService = {

  async getOverview({
    churchId,
  }) {


    const overviewResult =
      await pool.query(
        `
        SELECT

          /*
            Total money received
            by local funds
          */
          COALESCE(
            SUM(
              CASE
                WHEN g.group_type = 'local'
                AND t.type = 'IN'
                THEN t.amount
                ELSE 0
              END
            ),
            0
          ) AS total_local_funds,



          /*
            Total trust funds received
          */
          COALESCE(
            SUM(
              CASE
                WHEN g.group_type = 'trust'
                AND t.type = 'IN'
                THEN t.amount
                ELSE 0
              END
            ),
            0
          ) AS total_trust_funds,



          /*
            Current month local receipts
          */
          COALESCE(
            SUM(
              CASE
                WHEN g.group_type = 'local'
                AND t.type = 'IN'
                AND DATE_TRUNC(
                  'month',
                  t.transaction_date
                )
                =
                DATE_TRUNC(
                  'month',
                  CURRENT_DATE
                )
                THEN t.amount
                ELSE 0
              END
            ),
            0
          ) AS monthly_local_receipts,



          /*
            Current month trust receipts
          */
          COALESCE(
            SUM(
              CASE
                WHEN g.group_type = 'trust'
                AND t.type = 'IN'
                AND DATE_TRUNC(
                  'month',
                  t.transaction_date
                )
                =
                DATE_TRUNC(
                  'month',
                  CURRENT_DATE
                )
                THEN t.amount
                ELSE 0
              END
            ),
            0
          ) AS monthly_trust_receipts,



          /*
            Current month expenses
          */
          COALESCE(
            SUM(
              CASE
                WHEN t.type = 'OUT'
                AND DATE_TRUNC(
                  'month',
                  t.transaction_date
                )
                =
                DATE_TRUNC(
                  'month',
                  CURRENT_DATE
                )
                THEN t.amount
                ELSE 0
              END
            ),
            0
          ) AS monthly_expenses,



          /*
            Current local balance
          */
          COALESCE(
            SUM(
              CASE

                WHEN g.group_type = 'local'
                AND t.type = 'IN'
                THEN t.amount


                WHEN g.group_type = 'local'
                AND t.type = 'OUT'
                THEN -t.amount


                ELSE 0

              END
            ),
            0
          ) AS available_local_balance


        FROM treasury_transactions t


        JOIN treasury_funds f
          ON f.id = t.fund_id


        JOIN treasury_fund_groups g
          ON g.id = f.group_id


        WHERE t.church_id = $1
        `,
        [
          churchId
        ]
      );





    /*
      Trust money already remitted
    */
    const remittedResult =
      await pool.query(
        `
        SELECT

          COALESCE(
            SUM(
              ri.amount
            ),
            0
          ) AS remitted


        FROM treasury_remittance_items ri


        JOIN treasury_remittances r
          ON r.id = ri.remittance_id


        WHERE r.church_id = $1

        `,
        [
          churchId
        ]
      );





    /*
      Current month trust received
      minus remitted
    */
    const trustBalanceResult =
      await pool.query(
        `
        SELECT

          COALESCE(
            SUM(t.amount),
            0
          ) AS received


        FROM treasury_transactions t


        JOIN treasury_funds f
          ON f.id = t.fund_id


        JOIN treasury_fund_groups g
          ON g.id = f.group_id


        WHERE t.church_id = $1

        AND g.group_type = 'trust'

        AND t.type = 'IN'


        AND DATE_TRUNC(
          'month',
          t.transaction_date
        )
        =
        DATE_TRUNC(
          'month',
          CURRENT_DATE
        )

        `,
        [
          churchId
        ]
      );






    const todayResult =
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

        AND transaction_date =
            CURRENT_DATE

        `,
        [
          churchId
        ]
      );





    const overview =
      overviewResult.rows[0];


    const today =
      todayResult.rows[0];


    const remitted =
      Number(
        remittedResult.rows[0].remitted
      );


    const trustReceived =
      Number(
        trustBalanceResult.rows[0].received
      );



    return {


      total_local_funds:
        Number(
          overview.total_local_funds
        ),


      total_trust_funds:
        Number(
          overview.total_trust_funds
        ),



      monthly_local_receipts:
        Number(
          overview.monthly_local_receipts
        ),



      monthly_trust_receipts:
        Number(
          overview.monthly_trust_receipts
        ),



      monthly_expenses:
        Number(
          overview.monthly_expenses
        ),



      available_local_balance:
        Number(
          overview.available_local_balance
        ),



      unremitted_trust_funds:
        trustReceived - remitted,



      today_count:
        Number(
          today.today_count
        ),



      today_recorded:
        Number(
          today.today_recorded
        ),



      today_expenses:
        Number(
          today.today_expenses
        ),

    };

  },

};