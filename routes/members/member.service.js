import { getMembers } from "./services/getMembers.js";
import { addMember } from "./services/addMember.js";
import { deleteMember } from "./services/deleteMember.js";

export const MemberService = {
  getMembers,
  addMember,
  deleteMember,
};