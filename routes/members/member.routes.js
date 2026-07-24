import { Router } from "express";
import { MemberController } from "./member.controller.js";
import { authorizeDepartment } from "../../middleware/authorizeDepartment.js"

const router = Router();
const authorized = authorizeDepartment("manage_dept_members");

router.get("/", MemberController.getMembers);

router.post("/", authorized, MemberController.addMember);

router.delete("/", authorized, MemberController.deleteMember);

export default router;