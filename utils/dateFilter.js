//utils/dateFilter.js

/**
 * Applies date filtering to a Supabase query
 * 
 * Supported query params:
 * - period=today|week|month|quarter|year
 * - start=YYYY-MM-DD
 * - end=YYYY-MM-DD
 *
 * @param {object} query - Supabase query builder
 * @param {object} params - req.query
 * @param {string} column - date column name (default: recorded_at)
 */
export function applyDateFilter(
  query,
  params = {},
  column = "recorded_at"
) {
  const { period, start, end } = params;

  let from;
  let to = new Date();

  // ---------------------------
  // PREDEFINED PERIODS
  // ---------------------------
  if (period) {
    const now = new Date();

    switch (period) {
      case "today":
        from = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        break;

      case "week":
        from = new Date(now);
        from.setDate(now.getDate() - 7);
        break;

      case "month":
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;

      case "quarter":
        from = new Date(
          now.getFullYear(),
          Math.floor(now.getMonth() / 3) * 3,
          1
        );
        break;

      case "year":
        from = new Date(now.getFullYear(), 0, 1);
        break;
    }
  }

  // ---------------------------
  // CUSTOM RANGE OVERRIDE
  // ---------------------------
  if (start) {
    from = new Date(start);
  }

  if (end) {
    to = new Date(end);
  }

  // ---------------------------
  // APPLY FILTERS
  // ---------------------------
  if (from) {
    query = query.gte(column, from.toISOString());
  }

  if (to) {
    query = query.lte(column, to.toISOString());
  }

  return query;
}
