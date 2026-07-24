import { Router } from "express";
import { authorize } from "../../middleware/authorize.js";
import {
  getDashboard,
} from "./pastor.controller.js";

const router = Router();

router.get("/dashboard", authorize("access_pastor_dashboard"), getDashboard);

export default router;
