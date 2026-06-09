export function buildDateRange({
  period,
  year,
  month,
}) {
  if (period === "yearly") {
    return {
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31, 23, 59, 59),
    };
  }

  return {
    start: new Date(year, month - 1, 1),
    end: new Date(
      year,
      month,
      0,
      23,
      59,
      59
    ),
  };
}