import express from "express";
import roleRequests from "./role-requests.js";// single file
import overview from "./overview.js";
import users from "./users.js";
import members from "./members.js";
import attendance from "./attendance.js";
import treasury from "./treasury.js";
import requestRole from "./role-requests/index.js";// folder router

const router = express.Router();

router.use("/role-requests", roleRequests);
router.use("/overview", overview);
router.use("/users", users);
router.use("/members", members);
router.use("/attendance", attendance);
router.use("/treasury", treasury);
router.use("/request-role", requestRole);
export default router;
