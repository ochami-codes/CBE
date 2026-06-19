import express from "express";
import {
  getTreasuryOverview,
  getFundGroups,
  getFunds,
  getFundSummary,
  getTransactions,
  createTransaction,
  getMemberGivingSummary,
  getMemberGivingHistory,
} from "./TreasuryController.js";
const router = express.Router();

router.get("/overview",getTreasuryOverview);
router.get("/fund-groups", getFundGroups);
router.get("/funds",getFunds);
router.get("/funds/:id/summary",getFundSummary);
router.get("/transactions",getTransactions);
router.post("/transactions",createTransaction);
router.get("/members/giving-summary", getMemberGivingSummary);
router.get("/members/:id/giving-history",getMemberGivingHistory);

export default router;