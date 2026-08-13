import { AuthService } from "./auth.service.js";

import {
  createHandler,
  getHandler,
} from "../../utils/controller.js";
const isProduction =
  process.env.NODE_ENV === "production";
export const AuthController = {
  
 login: async (req, res, next) => {
  try {
    const result = await AuthService.login({
      email: req.body.email,
      password: req.body.password,
    });

    const {
      accessToken,
      refreshToken,
    } = result.session;

    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return res.status(200).json({
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
},
logout: async (req, res, next) => {
  try {
    res.clearCookie("access_token", {
      httpOnly: true,
      secure:
        isProduction,
      sameSite:
        isProduction
          ? "none"
          : "lax",
    });

    res.clearCookie("refresh_token", {
      httpOnly: true,
      secure:
        isProduction,
      sameSite:
        isProduction
          ? "none"
          : "lax",
    });

    return res.status(200).json({
      message: "Logged out successfully.",
    });
  } catch (error) {
    next(error);
  }
},
  register: createHandler(async (req) =>
    AuthService.register(req.body)
  ),

  resetPassword: createHandler(async (req) =>
    AuthService.resetPassword({
      email: req.body.email,
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