import { TreasuryService } from "./services/TreasuryService.js";
import { FundGroupsService } from "./services/FundGroupsService.js";
import { FundsService } from "./services/FundService.js";
import { TransactionsService } from "./services/TransactionService.js";
import { MembersService } from "./services/MemberService.js";

/* ==========================================================================
   OVERVIEW
   ========================================================================== */

export async function getTreasuryOverview(req, res) {
  try {
    const churchId = req.user.active_church_id;
    const { start, end } = req.query;

    const data = await TreasuryService.getOverview({
      churchId,
      start,
      end,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

/* ==========================================================================
   FUND GROUPS
   ========================================================================== */

export async function getFundGroups(req, res) {
  try {
    const churchId = req.user.active_church_id;

    const data = await FundGroupsService.getAll(churchId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

/* ==========================================================================
   FUNDS
   ========================================================================== */
export async function getFunds(req, res) {
  try {
    const churchId =
      req.user.active_church_id;


    const {
      group_id,
      department_id,
      active,
    } = req.query;



    const data =
      await FundsService.getFunds({

        churchId,

        groupId:
          group_id || null,

        departmentId:
          department_id || null,

        active:
          active !== "false",

      });



    return res.status(200).json({

      success: true,

      data,

    });


  } catch (error) {

    return res.status(500).json({

      success: false,

      message:
        error.message,

    });

  }
}





export async function getFundSummary(req, res) {

  try {

    const data =
      await FundsService.getSummary({

        churchId:
          req.user.active_church_id,

        fundId:
          req.params.id,

      });



    return res.status(200).json({

      success: true,

      data,

    });


  } catch (error) {

    return res.status(500).json({

      success: false,

      message:
        error.message,

    });

  }

}

/* ==========================================================================
   TRANSACTIONS
   ========================================================================== */

export async function getTransactions(req, res) {
  try {
    const churchId = req.user.active_church_id;
    const { fund_id, start, end } = req.query;

    const data = await TransactionsService.getAll({
      churchId,
      fundId: fund_id,
      start,
      end,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function createTransaction(req, res) {
  try {
    const churchId = req.user.active_church_id;

    const data = await TransactionsService.create({
      churchId,
      recordedBy: req.user.profileId,
      ...req.body,
    });

    return res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

/* ==========================================================================
   MEMBER GIVING
   ========================================================================== */

export async function getMemberGivingSummary(req, res) {
  try {
    const churchId = req.user.active_church_id;

    const data = await MembersService.getGivingSummary(churchId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getMemberGivingHistory(req, res) {
  try {
    const churchId = req.user.active_church_id;
    const { memberId } = req.params;

    const data = await MembersService.getMemberHistory({
      churchId,
      memberId,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}