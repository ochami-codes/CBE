import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

function createRequestSupabaseClient() {
  return createClient(
    supabaseUrl,
    anonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

export async function authMiddleware(req, res, next) {
  try {
    const accessToken =
      req.cookies?.access_token;

    const refreshToken =
      req.cookies?.refresh_token;

    /* -----------------------------
       No session
    ----------------------------- */

    if (!accessToken || !refreshToken) {
      return res.status(401).json({
        message: "Please log in to continue.",
      });
    }

    const supabase = createRequestSupabaseClient();

    /* -----------------------------
       Validate current access token
    ----------------------------- */

    const {
      data: userData,
      error: userError,
    } = await supabase.auth.getUser(
      accessToken
    );

    /* -----------------------------
       Access token is valid
    ----------------------------- */

    if (!userError && userData?.user) {
      req.authUser = userData.user;
      req.accessToken = accessToken;
      req.refreshToken = refreshToken;

      return next();
    }

    /* -----------------------------
       Access token expired/invalid
       Try refresh token
    ----------------------------- */

    const {
      data: sessionData,
      error: refreshError,
    } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (
      refreshError ||
      !sessionData?.session ||
      !sessionData?.user
    ) {
      console.error(
        "Session refresh failed:",
        refreshError
      );

      return res.status(401).json({
        message:
          "Your session has expired. Please log in again.",
      });
    }

    const newAccessToken =
      sessionData.session.access_token;

    const newRefreshToken =
      sessionData.session.refresh_token;

    /* -----------------------------
       Replace cookies
    ----------------------------- */

    const isProduction =
      process.env.NODE_ENV === "production";

    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction
        ? "none"
        : "lax",
    };

    res.cookie(
      "access_token",
      newAccessToken,
      {
        ...cookieOptions,
        maxAge:
          60 * 60 * 1000,
      }
    );

    res.cookie(
      "refresh_token",
      newRefreshToken,
      {
        ...cookieOptions,
        maxAge:
          30 *
          24 *
          60 *
          60 *
          1000,
      }
    );

    /* -----------------------------
       Attach refreshed session
    ----------------------------- */

    req.authUser =
      sessionData.user;

    req.accessToken =
      newAccessToken;

    req.refreshToken =
      newRefreshToken;

    return next();
  } catch (error) {
    console.error(
      "Authentication error:",
      error
    );

    return res.status(500).json({
      message:
        "Something went wrong while verifying your session.",
    });
  }
}