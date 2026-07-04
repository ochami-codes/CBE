export function buildPeriodFilter(period) {

  switch (period) {

    case "monthly":
      return `
        AND DATE_TRUNC(
          'month',
          t.transaction_date
        ) =
        DATE_TRUNC(
          'month',
          CURRENT_DATE
        )
      `;

    case "quarterly":
      return `
        AND DATE_TRUNC(
          'quarter',
          t.transaction_date
        ) =
        DATE_TRUNC(
          'quarter',
          CURRENT_DATE
        )
      `;

    case "yearly":
      return `
        AND DATE_TRUNC(
          'year',
          t.transaction_date
        ) =
        DATE_TRUNC(
          'year',
          CURRENT_DATE
        )
      `;

    default:
      return "";
  }
}