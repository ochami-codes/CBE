import { ClerkService } from "./clerk.service.js";

import {
  getHandler,
  createHandler,
  updateHandler,
} from "../../utils/controller.js";

export const ClerkController = {
  /* =========================
     MEMBERS
  ========================== */

  getMembers: getHandler((req) =>
    ClerkService.fetchMembers(
      req.user.active_church_id
    )
  ),

  addMember: createHandler((req) =>
    ClerkService.addMember({
      churchId:
        req.user.active_church_id,
      payload: req.body,
      createdBy: req.user.id,
    })
  ),

  updateMember: updateHandler((req) =>
    ClerkService.updateMember({
      churchId:
        req.user.active_church_id,
      memberId:
        req.params.memberId,
      payload: req.body,
      updatedBy: req.user.id,
    })
  ),

  /* =========================
     CHILDREN
  ========================== */

  getChildren: getHandler((req) =>
    ClerkService.fetchChildren(
      req.user.active_church_id
    )
  ),

  addChild: createHandler((req) =>
    ClerkService.addChild({
      churchId:
        req.user.active_church_id,
      payload: req.body,
      createdBy: req.user.id,
    })
  ),

  updateChild: updateHandler((req) =>
    ClerkService.updateChild({
      churchId:
        req.user.active_church_id,
      childId:
        req.params.childId,
      payload: req.body,
      updatedBy: req.user.id,
    })
  ),

  /* =========================
     PARENT SEARCH
  ========================== */

  searchParentMembers: getHandler((req) =>
    ClerkService.searchParentMembers({
      churchId:
        req.user.active_church_id,
      query:
        req.query.q ||
        req.query.query ||
        req.query.search,
    })
  ),

  /* =========================
     REPORTS
  ========================== */

  getSummaryReport: getHandler((req) =>
    ClerkService.getSummaryReport({
      churchId:
        req.user.active_church_id,
    })
  ),

  /* =========================
     TRANSFERS
  ========================== */

  approveTransfer: updateHandler((req) =>
    ClerkService.approveTransfer({
      churchId:
        req.user.active_church_id,
      transferId:
        req.params.id,
      approvedBy: req.user.id,
    })
  ),

  rejectTransfer: updateHandler((req) =>
    ClerkService.rejectTransfer({
      churchId:
        req.user.active_church_id,
      transferId:
        req.params.id,
      rejectedBy: req.user.id,
    })
  ),

  getTransferHistory: getHandler((req) =>
    ClerkService.getTransferHistory(
      req.user.active_church_id
    )
  ),

  createTransferRequest: createHandler((req) =>
    ClerkService.createTransferRequest({
      sourceChurchId:
        req.user.active_church_id,
      memberId: req.user.active_member_id,
      profileId:  req.user.id,
      destinationChurchId: req.body.destination_church_id,
      externalChurchName: req.body.external_church_name,
      conferenceId: req.body.conference_id,
      reason: req.body.reason,
      requestedBy: req.user.id,
    })
  ),
  createClerkTransfer: createHandler((req) =>
    ClerkService.createClerkTransfer({
      sourceChurchId:
        req.user.active_church_id,
      memberId: req.body.member_id,
      destinationChurchId: req.body.destination_church_id,
      externalChurchName: req.body.external_church_name,
      conferenceId: req.body.conference_id,
      reason: req.body.reason,
      processedBy: req.user.id,
    })
  ),
  getSourceTransfers: getHandler((req) =>
    ClerkService.getSourceTransfers(
      req.user.active_church_id
    )
  ),

  getDestinationTransfers: getHandler((req) =>
    ClerkService.getDestinationTransfers(
      req.user.active_church_id
    )
  ),

  approveDestinationTransfer:
    updateHandler((req) =>
      ClerkService.approveDestination({
        churchId:
          req.user.active_church_id,
        transferId:
          req.params.id,
        approvedBy:
          req.user.id,
      })
    ),

  approveSourceTransfer:
    updateHandler((req) =>
      ClerkService.approveSource({
        churchId:
          req.user.active_church_id,
        transferId:
          req.params.id,
        approvedBy:
          req.user.id,
      })
    ),

  rejectTransfer: updateHandler((req) =>
    ClerkService.rejectTransfer({
      churchId:
        req.user.active_church_id,
      transferId:
        req.params.id,
      rejectedBy: req.user.id,
    })
  ),

  /* =========================
     CLERK OVERVIEW
  ========================== */

  getClerkOverview: getHandler((req) =>
    ClerkService.fetchClerkOverview(
      req.user.active_church_id
    )
  ),
};