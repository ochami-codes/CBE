// middleware/authorizeChurch.js

import { pool } from "../db.js";

export async function authorizeChurch(
  req,
  res,
  next
) {
  try {
    const profileId =
      req.user?.id;

    const churchId =
      req.user?.active_church_id;

    /* -----------------------------------------
       AUTHENTICATION / CHURCH CONTEXT
    ----------------------------------------- */

    if (!profileId || !churchId) {
      return res.status(403).json({
        message:
          "Active church membership required.",
        code: "NO_ACTIVE_CHURCH",
      });
    }

    /* -----------------------------------------
       LOAD MEMBERSHIP STATUS
    ----------------------------------------- */

    const { rows } =
      await pool.query(
        `
        SELECT status
        FROM members
        WHERE profile_id = $1
          AND church_id = $2
        LIMIT 1;
        `,
        [
          profileId,
          churchId,
        ]
      );

    /* -----------------------------------------
       MEMBERSHIP NOT FOUND
    ----------------------------------------- */

    if (!rows.length) {
      return res.status(403).json({
        message:
          "You are not a member of this church.",
        code: "NOT_A_MEMBER",
      });
    }

    /* -----------------------------------------
       SUSPENDED MEMBERS
    ----------------------------------------- */

    if (
      rows[0].status ===
      "suspended"
    ) {
      return res.status(403).json({
        message:
          "Your membership is suspended.",
        code: "MEMBERSHIP_SUSPENDED",
      });
    }

    /* -----------------------------------------
       ANY NON-ACTIVE STATUS
    ----------------------------------------- */

    if (
      rows[0].status !==
      "active"
    ) {
      return res.status(403).json({
        message:
          "Active church membership required.",
        code: "INACTIVE_MEMBERSHIP",
      });
    }

    /* -----------------------------------------
       AUTHORIZED
    ----------------------------------------- */

    next();
  } catch (error) {
    next(error);
  }
}