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
import { authorize } from "../../middleware/authorize.js";
const router = express.Router();

/* -------------------------
   MEMBERS (system + non-system)
-------------------------- */
router.get("/members", getMembers);
router.post("/add-member",authorize("manage_records"), addMember);
router.patch("/members/:id", authorize("manage_records"), updateMember);
/* -------------------------
   CHILDREN REGISTER
-------------------------- */
router.get("/children", getChildren);
router.post("/add-child", authorize("manage_records"), addChild);
router.get("/search-parents", searchParents);
router.patch("/children/:id", authorize("manage_records"), updateChild);
/* -------------------------
   TRANSFERS
-------------------------- */

router.get("/transfers/source", authorize("manage_records"), getSourceTransfers);

router.get("/transfers/destination", authorize("manage_records"), getDestinationTransfers);

router.get("/transfers/history", authorize("manage_records"), getTransferHistory);

router.post("/transfers/create", createTransfer);

router.post("/transfers/:id/approve", authorize("manage_records"), approveTransferController);

router.post("/transfers/:id/reject", authorize("manage_records"), rejectTransferController);

router.get("/overview", authorize("manage_records"), getClerkOverview);

/* -------------------------
   REPORTS
-------------------------- */
router.get("/reports/summary",authorize("manage_records"), getSummaryReport);
export default router;