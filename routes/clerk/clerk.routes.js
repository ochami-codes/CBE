import express from "express";
import {
  getMembers,
  getTransfers,
  createTransfer,
  updateTransferStatus,
  addMember,
  getChildren,
   addChild,
  searchParents,
  getClerkOverview,
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
router.put("/transfers/:id/status", updateTransferStatus);
router.get("/overview", getClerkOverview);
export default router;