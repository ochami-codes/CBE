import express from "express";
import {
  getTreasuryOverview,
  getFundGroups,
  createFund,
  getFunds,
  getFundsSummary,
  getRemittances,
  getTransactions,
  createTransaction,
  createRemit,
  cancelRemit,
  getMemberGiving,
  getMyGiving,
} from "./TreasuryController.js";
const router = express.Router();

router.get("/overview",getTreasuryOverview);
router.get("/fund-groups", getFundGroups);
router.post("/funds", createFund);
router.get("/funds",getFunds);
router.get("/funds/remittances", getRemittances);
router.post("/funds/remit", createRemit);
router.patch("/funds/remit/:id/cancel", cancelRemit);
router.get("/funds/summary", getFundsSummary);
router.get("/transactions",getTransactions);
router.post("/transactions",createTransaction);
router.get("/members/:memberId/ledger",getMemberGiving);
router.get("/me/ledger", getMyGiving);

export default router;