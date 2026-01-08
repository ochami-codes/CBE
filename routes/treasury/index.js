import express from "express";
import envelopeRoutes from "./envelope.js";
import summaryRoutes from "./summary.js";

const router = express.Router();

router.use("/envelopes", envelopeRoutes);
router.use("/summary", summaryRoutes);

export default router;
