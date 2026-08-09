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
} from "./treasury.controller.js";
import { authorize } from "../../middleware/authorize.js";
import { authorizeDepartment } from "../../middleware/authorizeDepartment.js";
const router = express.Router();
const authorized = authorize("manage_finances");

router.get("/overview", authorized, getTreasuryOverview);
router.get("/fund-groups", authorized, getFundGroups);
router.post("/funds", authorized, createFund);
router.get("/funds", authorized, getFunds);
router.get("/funds/remittances", authorized, getRemittances);
router.post("/funds/remit", authorized, createRemit);
router.patch("/funds/remit/:id/cancel", authorized, cancelRemit);
router.get("/funds/summary", authorizeDepartment("view_dept_finances"), getFundsSummary);
router.get("/transactions", authorized, getTransactions);
router.post("/transactions", authorized, createTransaction);
router.get("/members/:memberId/ledger", authorized, getMemberGiving);
router.get("/me/ledger", getMyGiving);

export default router;