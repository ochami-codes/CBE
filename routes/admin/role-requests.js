import express from "express";
import { pool } from "../../db.js";

const router = express.Router();

/* =====================================================
   ACCESS CONTROL
===================================================== */
function requireRoleManagement(req, res) {
  const permissions =
    req.user?.permissions || [];

  const activeChurchId =
    req.user?.active_church_id;

  if (!activeChurchId) {
    res.status(403).json({
      error: "Active membership required",
    });
    return false;
  }

  if (
    !permissions.includes(
      "manage_roles"
    )
  ) {
    res.status(403).json({
      error:
        "Missing manage_roles permission",
    });

    return false;
  }

  return true;
}

/* =====================================================
   GET /admin/role-requests
   Pending role requests
===================================================== */
router.get("/", async (req, res) => {
  if (!requireRoleManagement(req, res))
    return;

  const client = await pool.connect();

  try {
    const churchId =
      req.user.active_church_id;

    const { rows } =
      await client.query(
        `
        SELECT
          rr.id,
          rr.member_id,
          rr.requested_role,
          rr.role_request_status,
          rr.role_requested_at,

          p.full_name,
          p.email

        FROM role_requests rr

        JOIN members m
          ON m.id = rr.member_id

        JOIN profiles p
          ON p.id = m.profile_id

        WHERE rr.church_id = $1
          AND rr.role_request_status =
              'pending'

        ORDER BY
          rr.role_requested_at DESC
        `,
        [churchId]
      );

    res.json({
      requests: rows,
    });

  } catch (err) {
    console.error(
      "Fetch role requests:",
      err
    );

    res.status(500).json({
      error:
        err.message ||
        "Failed to load requests",
    });

  } finally {
    client.release();
  }
});

/* =====================================================
   POST /:id/review
   Approve / reject request
===================================================== */
router.post(
  "/:id/review",
  async (req, res) => {
    if (
      !requireRoleManagement(
        req,
        res
      )
    )
      return;

    const client =
      await pool.connect();

    try {
      const requestId =
        req.params.id;

      const churchId =
        req.user.active_church_id;

      const adminMember =
        req.user.memberships?.find(
          (m) =>
            m.church_id ===
              churchId &&
            m.status === "active"
        );

      const adminMemberId =
        adminMember?.id;

      const { action } =
        req.body;

      if (
        ![
          "approved",
          "rejected",
        ].includes(action)
      ) {
        return res
          .status(400)
          .json({
            error:
              "Invalid action",
          });
      }

      await client.query(
        "BEGIN"
      );

      const reqRes =
        await client.query(
          `
          SELECT *
          FROM role_requests
          WHERE id = $1
          FOR UPDATE
          `,
          [requestId]
        );

      if (
        !reqRes.rows.length
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(404)
          .json({
            error:
              "Request not found",
          });
      }

      const request =
        reqRes.rows[0];

      if (
        request.role_request_status !==
        "pending"
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(400)
          .json({
            error:
              "Request already handled",
          });
      }

      /* ---------- Approval ---------- */

      if (
        action ===
        "approved"
      ) {
        const roleRes =
          await client.query(
            `
            SELECT id
            FROM roles
            WHERE LOWER(name)
              = LOWER($1)
            LIMIT 1
            `,
            [
              request.requested_role,
            ]
          );

        if (
          !roleRes.rows.length
        ) {
          await client.query(
            "ROLLBACK"
          );

          return res
            .status(404)
            .json({
              error:
                "Role not found",
            });
        }

        const roleId =
          roleRes.rows[0].id;

        await client.query(
          `
          INSERT INTO member_roles (
            member_id,
            role_id
          )
          VALUES ($1,$2)
          ON CONFLICT DO NOTHING
          `,
          [
            request.member_id,
            roleId,
          ]
        );
      }

      /* ---------- Update request ---------- */

      await client.query(
        `
        UPDATE role_requests
        SET
          role_request_status=$1,
          role_reviewed_at=NOW(),
          role_reviewed_by=$2
        WHERE id=$3
        `,
        [
          action,
          adminMemberId,
          requestId,
        ]
      );

      /* ---------- Notify member ---------- */

      const profileRes =
        await client.query(
          `
          SELECT profile_id
          FROM members
          WHERE id=$1
          `,
          [
            request.member_id,
          ]
        );

      const profileId =
        profileRes.rows[0]
          ?.profile_id;

      if (profileId) {
        await client.query(
          `
          INSERT INTO notifications(
            user_id,
            church_id,
            type,
            title,
            message,
            related_id,
            related_type,
            is_read,
            created_at
          )

          VALUES(
            $1,
            $2,

            CASE
              WHEN $3='approved'
              THEN 'role_request_approved'
              ELSE 'role_request_rejected'
            END,

            CASE
              WHEN $3='approved'
              THEN 'Role Approved'
              ELSE 'Role Rejected'
            END,

            CASE
              WHEN $3='approved'
              THEN
              'Your role request was approved.'
              ELSE
              'Your role request was rejected.'
            END,

            $4,
            'role_request',
            false,
            NOW()
          )
          `,
          [
            profileId,
            churchId,
            action,
            requestId,
          ]
        );
      }

      await client.query(
        "COMMIT"
      );

      res.json({
        success: true,
        action,
      });

    } catch (err) {
      await client.query(
        "ROLLBACK"
      );

      console.error(
        "Role review:",
        err
      );

      res.status(500).json({
        error:
          err.message ||
          "Failed to review request",
      });

    } finally {
      client.release();
    }
  }
);

/* =====================================================
   PUT /:id/roles
   Replace member roles
===================================================== */
router.put(
  "/:id/roles",
  async (req, res) => {
    if (
      !requireRoleManagement(
        req,
        res
      )
    )
      return;

    const client =
      await pool.connect();

    try {
      const memberId =
        req.params.id;

      const churchId =
        req.user.active_church_id;

      const {
        roles,
        primary_role,
      } = req.body;

      const memberRes =
        await client.query(
          `
          SELECT id
          FROM members
          WHERE id=$1
          AND church_id=$2
          `,
          [
            memberId,
            churchId,
          ]
        );

      if (
        !memberRes.rows.length
      ) {
        return res
          .status(404)
          .json({
            error:
              "Member not found",
          });
      }

      if (
        !Array.isArray(
          roles
        ) ||
        !roles.length
      ) {
        return res
          .status(400)
          .json({
            error:
              "Roles required",
          });
      }

      if (
        !roles.includes(
          primary_role
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              "Primary role must exist in roles",
          });
      }

      const roleRes =
        await client.query(
          `
          SELECT id,name
          FROM roles
          WHERE LOWER(name)
            = ANY($1)
          `,
          [
            roles.map((r) =>
              r.toLowerCase()
            ),
          ]
        );

      const roleMap =
        new Map(
          roleRes.rows.map(
            (r) => [
              r.name.toLowerCase(),
              r.id,
            ]
          )
        );

      const primaryRoleId =
        roleMap.get(
          primary_role.toLowerCase()
        );

      await client.query(
        "BEGIN"
      );

      await client.query(
        `
        DELETE
        FROM member_roles
        WHERE member_id=$1
        `,
        [memberId]
      );

      for (const role of roles) {
        await client.query(
          `
          INSERT INTO member_roles(
            member_id,
            role_id
          )
          VALUES($1,$2)
          `,
          [
            memberId,
            roleMap.get(
              role.toLowerCase()
            ),
          ]
        );
      }

      await client.query(
        `
        UPDATE members
        SET primary_role_id=$1
        WHERE id=$2
        `,
        [
          primaryRoleId,
          memberId,
        ]
      );

      await client.query(
        "COMMIT"
      );

      res.json({
        message:
          "Roles updated",
      });

    } catch (err) {
      await client.query(
        "ROLLBACK"
      );

      console.error(
        "Update roles:",
        err
      );

      res.status(500).json({
        error:
          "Failed to update roles",
      });

    } finally {
      client.release();
    }
  }
);

export default router;
