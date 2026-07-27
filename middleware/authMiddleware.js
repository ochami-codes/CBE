import { supabaseAuth } from "../supabaseClient.js";

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // No Authorization header
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Please log in to continue.",
      });
    }

    const [, token] = authHeader.split(" ");

    // Invalid/missing token
    if (
      !token ||
      token === "null" ||
      token === "undefined"
    ) {
      return res.status(401).json({
        message: "Please log in to continue.",
      });
    }

    const { data, error } =
      await supabaseAuth.auth.getUser(token);

    // Token exists but is invalid or expired
    if (error || !data.user) {
      return res.status(401).json({
        message:
          "Your session has expired. Please log in again.",
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
