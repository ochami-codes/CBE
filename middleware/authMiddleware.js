import { supabaseAuth } from "../supabaseClient.js";

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Please log in to continue.",
      });
    }

    const token = authHeader.split(" ")[1];

    const { data, error } =
      await supabaseAuth.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        message: "Your session has expired. Please log in again.",
      });
    }

    req.authUser = data.user;

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(500).json({
      message:
        "Something went wrong while verifying your session.",
    });
  }
}
