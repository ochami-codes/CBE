export function createCookieStorage(req, res) {
  const cookieOptions = {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };

  return {
    getItem(key) {
      return req.cookies?.[key] ?? null;
    },

    setItem(key, value) {
      res.cookie(
        key,
        value,
        cookieOptions
      );
    },

    removeItem(key) {
      res.clearCookie(
        key,
        cookieOptions
      );
    },
  };
}