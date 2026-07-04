import { validateMember } from "./validateMember.js";
import { getMember } from "./getMember.js";
import { buildPeriodFilter } from "./buildPeriodFilter.js";
import { getSummary } from "./getSummary.js";
import { getTransactions } from "./getTransactions.js";

export async function getMemberLedger({
  churchId,
  memberId,
  period = "monthly",
}) {
  await validateMember({
    churchId,
    memberId,
  });

  const periodFilter =
    buildPeriodFilter(period);

  const [
    member,
    summary,
    transactions,
  ] = await Promise.all([
    getMember({
      churchId,
      memberId,
    }),
    getSummary({
      churchId,
      memberId,
      periodFilter,
    }),
    getTransactions({
      churchId,
      memberId,
      periodFilter,
    }),
  ]);

  return {
    member,
    summary,
    transactions,
  };
}