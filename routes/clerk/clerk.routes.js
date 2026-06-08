import express from "express";
import {
  getMembers,
  getTransfers,
  createTransfer,
  addMember,
  getChildren,
   addChild,
  searchParents,
  getClerkOverview,
  approveTransferController,
   rejectTransferController,
} from "./clerk.controller.js";

const router = express.Router();

/* -------------------------
   MEMBERS (system + non-system)
-------------------------- */
router.get("/members", getMembers);
router.post("/add-member", addMember);

/* -------------------------
   MEMBERS (system + non-system)
-------------------------- */
router.get("/members", getMembers);
router.post("/add-member", addMember);
/* -------------------------
   CHILDREN REGISTER
-------------------------- */
router.get("/children", getChildren);
router.post("/add-child", addChild);
router.get("/search-parents", searchParents);
/* -------------------------
   TRANSFERS REGISTER
-------------------------- */
router.get("/transfers", getTransfers);
router.post("/transfers/create", createTransfer);
router.get("/overview", getClerkOverview);
router.post("/transfers/:id/approve", approveTransferController);
router.post("/transfers/:id/reject", rejectTransferController);
export default router;