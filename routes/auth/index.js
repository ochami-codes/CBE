import express from "express";

import login from "./login.js";
import register from "./register.js";
import callback from "./callback.js";
import me from "./me.js";
import logout from "./logout.js";
import adminInvite from "./invite.js";
import verifyEmail from "./verify-email.js";
import resendVerification from "./resend-verification.js";
import resetPasswordConfirm from "./reset-password-confirm.js";
import changePassword from "./change-password.js";
import resetPassword from "./reset-password.js";

const router = express.Router();

router.use("/login", login);
router.use("/register", register);
router.use("/callback", callback);
router.use("/me", me);
router.use("/logout", logout);
router.use("/invite", adminInvite);
router.use("/verify-email", verifyEmail);
router.use("/reset-password-confirm", resetPasswordConfirm);
router.use("/change-password", changePassword);
router.use("/reset-password", resetPassword);
router.use("/resend-verification", resendVerification);
export default router;
