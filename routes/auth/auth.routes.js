import express from "express";
import { AuthController } from "./auth.controller.js";
import {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
} from "../../middleware/rateLimiter.js";
import { userContext } from "../../middleware/userContext.js";
const router = express.Router();

router.post("/login", loginLimiter, AuthController.login);
router.post("/register", registerLimiter, AuthController.register);
router.post("/verification/resend", AuthController.resendVerification);
router.post("/password/reset", forgotPasswordLimiter, AuthController.resetPassword);
router.post("/password/change", userContext, resetPasswordLimiter, AuthController.changePassword);
router.get("/me", userContext, AuthController.getMe);

export default router;