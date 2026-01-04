import express from "express";
import pendingCount from "./pending-count.js";

const router = express.Router();

router.use("/pending-count", pendingCount);

export default router;
