import { login } from "./services/login.js";
import { register } from "./services/register.js";
import { resetPassword } from "./services/resetPassword.js";
import { changePassword } from "./services/changePassword.js";
import { resendVerification } from "./services/resendVerification.js";

export const AuthService = {
login,
register,
resetPassword,
changePassword,
resendVerification,
};