import express from "express";
import overview from "./overview.js";

const router = express.Router();

router.use("/overview", overview);

export default router;
