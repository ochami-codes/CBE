export async function  getEligibleTransactions({
  client,
  churchId,
  months,
}) {
  const result = await client.query(
    `
    SELECT
      t.id,
      t.amount,
      t.transaction_date,
      t.fund_id

    FROM treasury_transactions t

    INNER JOIN treasury_funds f
      ON f.id = t.fund_id

    INNER JOIN treasury_fund_groups g
      ON g.id = f.group_id

    WHERE
      f.church_id = $1
      AND g.group_type = 'trust'
      AND t.type = 'IN'
      AND t.remittance_id IS NULL
      AND TO_CHAR(
        t.transaction_date,
        'YYYY-MM'
      ) = ANY($2)

    ORDER BY
      t.transaction_date
    `,
    [
      churchId,
      months,
    ]
  );

  return result.rows.map(row => ({
    id: row.id,
    fundId: row.fund_id,
    amount: Number(row.amount),
    transactionDate:
      row.transaction_date,
  }));
}