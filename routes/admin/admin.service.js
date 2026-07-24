import { getChurchMembers } from "./services/getChurchMembers.js";
import { updateMemberRoles } from "./services/updateMemberRoles.js";
import { updateMemberStatus } from "./services/updateMemberStatus.js";

export const AdminService = {
  getChurchMembers,
  updateMemberRoles,
  updateMemberStatus,
};