import { Router } from "express";

import {
  getDashboard,
} from "./PastorController.js";

const router = Router();

router.get("/dashboard",getDashboard);

export default router;
