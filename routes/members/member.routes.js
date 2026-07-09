import { Router } from "express";
import { MemberController } from "./member.controller.js";

const router = Router();

router.get("/", MemberController.getMembers);

router.post("/", MemberController.addMember);

router.delete("/", MemberController.deleteMember);

export default router;