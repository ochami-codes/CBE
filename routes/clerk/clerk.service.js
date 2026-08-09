import { addChild } from "./services/addChild.js";
import { addMember } from "./services/addMember.js";
import { updateMember } from "./services/updateMember.js";
import { updateChild } from "./services/updateChild.js";
import { fetchMembers } from "./services/fetchMembers.js";
import { fetchChildren } from "./services/fetchChildren.js";
import { searchParentMembers } from "./services/searchParentMembers.js";
import { getSummaryReport } from "./services/getSummaryReport.js";
import { approveDestination } from "./services/approveDestination.js";
import { approveSource } from "./services/approveSource.js";
import { getTransferHistory } from "./services/getTransferHistory.js";
import { createTransferRequest } from "./services/createTransferRequest.js";
import { createClerkTransfer } from "./services/createClerkTransfer.js";
import { getSourceTransfers } from "./services/getSourceTransfers.js";
import { getDestinationTransfers } from "./services/getDestinationTransfers.js";
import { fetchClerkOverview } from "./services/fetchClerkOverview.js";
import { fetchTransfers } from "./services/fetchTransfers.js";
import { rejectTransfer } from "./services/rejectTransfer.js";

export const ClerkService = {
  addChild,
  addMember,
  updateMember,
  updateChild,
  fetchMembers,
  fetchChildren,
  searchParentMembers,
  getSummaryReport,
  approveDestination,
  approveSource,
  getTransferHistory,
  createTransferRequest,
  createClerkTransfer,
  getSourceTransfers,
  getDestinationTransfers,
  fetchClerkOverview,
  fetchTransfers,
  rejectTransfer,
};

