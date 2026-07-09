// middleware/authMiddleware.js
import { supabaseAuth } from "../supabaseClient.js";

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    const { data, error } =
      await supabaseAuth.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.authUser = data.user;
    next();
  } catch (err) {
    return res.status(500).json({ message: "Auth error" });
  }
}
