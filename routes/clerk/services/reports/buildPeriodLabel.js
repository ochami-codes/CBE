export function buildPeriodLabel(meta) {
  const { period, year, month, quarter } = meta;

  if (period === "monthly") {
    const monthName = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ][month];

    return `${monthName} ${year}`;
  }

  if (period === "quarterly") {
    return `Q${quarter} ${year}`;
  }

  return `Year ${year}`;
}