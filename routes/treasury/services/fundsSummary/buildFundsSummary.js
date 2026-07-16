export function buildFundsSummary({
  funds,
  unremittedRows,
}) {
  const trustFunds = funds.filter(
    (fund) =>
      fund.group_type === "trust" &&
      fund.department_id === null
  );

  const localFunds = funds.filter(
    (fund) =>
      fund.group_type === "local" &&
      fund.department_id === null
  );

  const departmentFunds = funds.filter(
    (fund) =>
      fund.department_id !== null
  );

  const sum = (list) =>
    list.reduce(
      (total, fund) =>
        total + fund.balance,
      0
    );

  const trustBalance =
    sum(trustFunds);

  const localBalance =
    sum(localFunds);

  const departmentBalance =
    sum(departmentFunds);

  const unremittedMonths =
    Object.values(
      unremittedRows.reduce(
        (groups, row) => {
          const key = row.month;

          if (!groups[key]) {
            groups[key] = {
              month: row.month,
              total: 0,
              transactions: [],
            };
          }

          groups[key].total +=
            Number(row.amount);

          groups[key].transactions.push({
            id: row.id,
            fundId: row.fund_id,
            fundName:
              row.fund_name,
            transactionDate:
              row.transaction_date,
            amount: Number(
              row.amount
            ),
          });

          return groups;
        },
        {}
      )
    );

  return {
    summary: {
      overallBalance:
        trustBalance +
        localBalance +
        departmentBalance,

      trustBalance,
      localBalance,
      departmentBalance,

      pendingRemittance:
        unremittedMonths.reduce(
          (total, month) =>
            total + month.total,
          0
        ),
    },

    trustFunds,
    localFunds,
    departmentFunds,

    unremittedMonths,
  };
}