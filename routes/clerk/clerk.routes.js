import express from "express";
import {
  getMembers,
   getSourceTransfers,
   getDestinationTransfers,
   getTransferHistory,
  createTransfer,
  addMember,
  updateMember,
  getChildren,
   addChild,
   updateChild,
  searchParents,
  getClerkOverview,
  approveTransferController,
   rejectTransferController,
   getSummaryReport,
} from "./clerk.controller.js";

const router = express.Router();

/* -------------------------
   MEMBERS (system + non-system)
-------------------------- */
router.get("/members", getMembers);
router.post("/add-member", addMember);
router.patch("/members/:id", updateMember);
/* -------------------------
   CHILDREN REGISTER
-------------------------- */
router.get("/children", getChildren);
router.post("/add-child", addChild);
router.get("/search-parents", searchParents);
router.patch("/children/:id", updateChild);
/* -------------------------
   TRANSFERS
-------------------------- */

router.get("/transfers/source", getSourceTransfers);

router.get("/transfers/destination", getDestinationTransfers);

router.get("/transfers/history", getTransferHistory);

router.post("/transfers/create", createTransfer);

router.post("/transfers/:id/approve", approveTransferController);

router.post("/transfers/:id/reject", rejectTransferController);

router.get("/overview", getClerkOverview);

/* -------------------------
   REPORTS
-------------------------- */
router.get("/reports/summary", getSummaryReport);
export default router;