import { pool } from "../../../db.js";
import { buildDateRange } from "./buildDateRange.js";
import { getChurchInfo } from "./reports/churchInfo.js";
import { getMembershipSummary } from "./reports/membershipSummary.js";
import { getChildrenSummary } from "./reports/childrenSummary.js";
import { getTransferSummary } from "./reports/transferSummary.js";

export async function getSummaryReport({
  churchId,
  period,
  year,
  month,
}) {
  const dateRange =
    buildDateRange({
      period,
      year,
      month,
    });

  const [
    church,
    membership,
    children,
    transfers,
  ] = await Promise.all([
    getChurchInfo(churchId),

    getMembershipSummary({
      churchId,
      dateRange,
    }),

    getChildrenSummary({
      churchId,
      dateRange,
    }),

    getTransferSummary({
      churchId,
      dateRange,
    }),
  ]);

  return {
    church,

    period: {
      type: period,
      year,
      month,
      start_date: dateRange.start,
      end_date: dateRange.end,
    },

    membership,
    children,
    transfers,

    generated_at: new Date(),
  };
}