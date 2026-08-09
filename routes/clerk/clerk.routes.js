import express from "express";
import { ClerkController } from "./clerk.controller.js";
import { authorize } from "../../middleware/authorize.js";
const router = express.Router();

/* -------------------------
   MEMBERS (system + non-system)
-------------------------- */
router.get("/members", ClerkController.getMembers);
router.post("/add-member",authorize("manage_records"), ClerkController.addMember);
router.patch("/members/:memberId", authorize("manage_records"), ClerkController.updateMember);
/* -------------------------
   CHILDREN REGISTER
-------------------------- */
router.get("/children", ClerkController.getChildren);
router.post("/add-child", authorize("manage_records"), ClerkController.addChild);
router.get("/search-parents", ClerkController.searchParentMembers);
router.patch("/children/:childId", authorize("manage_records"), ClerkController.updateChild);
/* -------------------------
   TRANSFERS
-------------------------- */

router.get("/transfers/source", authorize("manage_records"), ClerkController.getSourceTransfers);

router.get("/transfers/destination", authorize("manage_records"), ClerkController.getDestinationTransfers);

router.get("/transfers/history", authorize("manage_records"), ClerkController.getTransferHistory);

router.post("/transfers/create", ClerkController.createTransferRequest);
router.post("/transfers/clerk/create", authorize("manage_records"), ClerkController.createClerkTransfer);
router.post("/transfers/source/:id/approve", authorize("manage_records"), ClerkController.approveSourceTransfer);

router.post("/transfers/destination/:id/approve", authorize("manage_records"), ClerkController.approveDestinationTransfer);

router.post("/transfers/:id/reject", authorize("manage_records"), ClerkController.rejectTransfer);

router.get("/overview", authorize("manage_records"), ClerkController.getClerkOverview);

/* -------------------------
   REPORTS
-------------------------- */
//router.get("/reports/summary",authorize("manage_records"), ClerkController.getSummaryReport);
export default router;