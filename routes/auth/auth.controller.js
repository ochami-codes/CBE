import { AuthService } from "./auth.service.js";

import {
  createHandler,
  getHandler,
} from "../../utils/controller.js";

export const AuthController = {
  login: createHandler(async (req) =>
    AuthService.login({
      email: req.body.email,
      password: req.body.password,
    })
  ),

  register: createHandler(async (req) =>
    AuthService.register(req.body)
  ),

  resetPassword: createHandler(async (req) =>
    AuthService.resetPassword({
      email: req.body.email,
    })
  ),

  changePassword: createHandler(async (req) =>
    AuthService.changePassword({
      authUserId: req.user.auth_user_id,
      newPassword: req.body.newPassword,
    })
  ),

  resendVerification: createHandler(async (req) =>
    AuthService.resendVerification({
      email: req.body.email,
    })
  ),

  getMe: getHandler(async (req) => ({
    user: req.user,
  })),
};