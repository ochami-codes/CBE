import express from "express";
import { ProfileController } from "./profile.controller.js";

const router = express.Router();

router.get(
  "/",
  ProfileController.getProfile
);

export default router;