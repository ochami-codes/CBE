import express from "express";
import { ProfileController } from "./profile.controller.js";

const router = express.Router();

router.get("/me", ProfileController.getProfile);
router.patch("/me", ProfileController.updateProfile);
router.patch("/me/password", ProfileController.changePassword);
export default router;