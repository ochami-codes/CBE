import express from "express";
import roleRequests from "./role-requests.js";// single file
import overview from "./overview.js";
import users from "./users.js";
import requestRole from "./role-requests/index.js";// folder router

const router = express.Router();

router.use("/role-requests", roleRequests);
router.use("/overview", overview);
router.use("/users", users);
router.use("/request-role", requestRole);
export default router;
