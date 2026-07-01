import express from "express";
import {
  getTreasuryOverview,
  getFundGroups,
  createFund,
  getFunds,
  getFundsSummary,
  getTransactions,
  createTransaction,
  createRemit,
  cancelRemit,
  getMemberGivingSummary,
  getMemberGivingHistory,
} from "./TreasuryController.js";
const router = express.Router();

router.get("/overview",getTreasuryOverview);
router.get("/fund-groups", getFundGroups);
router.post("/funds", createFund);
router.get("/funds",getFunds);
router.post("/funds/remit", createRemit);
router.patch("/funds/remit/:id/cancel", cancelRemit);
router.get("/funds/summary", getFundsSummary);
router.get("/transactions",getTransactions);
router.post("/transactions",createTransaction);
router.get("/members/giving-summary", getMemberGivingSummary);
router.get("/members/:id/giving-history",getMemberGivingHistory);

export default router;