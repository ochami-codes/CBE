import { getOverview } from "./services/getOverview.js";
import { getDepartments } from "./services/getDepartments.js";
import { getTreasury } from "./services/getTreasury.js";
import { getMembers } from "./services/getMembers.js";

export const PastorService = {
  async getDashboard({
    churchId,
  }) {
    const [
      overview,
      departments,
      treasury,
      members,
    ] = await Promise.all([
      getOverview({
        churchId,
      }),
      getDepartments({
        churchId,
      }),
      getTreasury({
        churchId,
      }),
      getMembers({
        churchId,
      }),
    ]);

    return {
      overview,
      departments,
      treasury,
      members,
    };
  },
};
  