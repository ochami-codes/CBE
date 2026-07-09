import { TreasuryService } from "./services/TreasuryService.js";
import { FundGroupsService } from "./services/FundGroupsService.js";
import { FundsService } from "./services/FundService.js";
import { RemittanceService } from "./services/RemittanceService.js";
import { TransactionsService } from "./services/TransactionService.js";
import {getMemberLedger} from "./services/members/getMemberLedger.js";
import { handleRemittanceAction } from "./services/remittance/handleRemitAction.js";

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
export async function getRemittances(req, res) {
  try {
    const data =
      await RemittanceService.getRemittances({
        churchId:
          req.user.active_church_id,
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
export async function createRemit(req, res) {
  return handleRemittanceAction({
    req,
    res,
    statusCode: 201,
    successMessage:
      "Funds remitted successfully.",
    action: ({ churchId, profileId }) =>
      RemittanceService.create({
        churchId,
        profileId,
        months: req.body.months,
        notes: req.body.notes,
      }),
  });
}
export async function cancelRemit(req, res) {
  return handleRemittanceAction({
    req,
    res,
    successMessage:
      "Remittance cancelled successfully.",
    action: ({ churchId }) =>
      RemittanceService.cancel({
        churchId,
        remittanceId: req.params.id,
      }),
  });
}
/* ==========================================================================
   CREATE FUND
   ========================================================================== */

export async function createFund(req, res) {

  try {

    const churchId =
      req.user.active_church_id;

    const {
      name,
      department_id,
    } = req.body;


    const fund =
      await FundsService.create({

        churchId,

        name,

        departmentId:
          department_id || null,

      });


    return res.status(201).json({

      success: true,

      message:
        "Fund created successfully.",

      data: fund,

    });

  } catch (error) {

    console.error(
      "Create fund error:",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        error.message,

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
      group_type,
      department_id,
      active,
    } = req.query;



    const data =
      await FundsService.getFunds({

        churchId,

        groupId:
          group_id || null,

        groupType:
          group_type || null,

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

    console.error(
      "Get funds error:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        error.message,

    });

  }
}




export async function getFundsSummary(req, res) {
  try {
    const data =
      await FundsService.getSummary({
        churchId:
          req.user.active_church_id,
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
    const ProfileId = req.user.id;
    const churchId = req.user.active_church_id;

    const data = await TransactionsService.create({
      churchId,
      recordedBy: ProfileId,
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

export async function getMemberGiving(req, res) {
  try {
    const churchId = req.user.active_church_id;
    const { memberId } = req.params;
    const data = await getMemberLedger({
      churchId,
      memberId
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
export async function getMyGiving(req, res) {
  try {
    const churchId = req.user.active_church_id;

    const memberId = req.user.active_member_id;
    const data = await getMemberLedger({
      churchId,
      memberId,
    });

    res.json({
      success: true,
      data,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}