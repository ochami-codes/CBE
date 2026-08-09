import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";
import { notifyUser } from "./notificationService.js";

export async function updateMemberRoles({
  memberId,
  churchId,
  actorMemberId,
  roles,
}) {
  if (!memberId) {
    throw createAppError("Member is required.", 400, ERROR_CODES.VALIDATION_ERROR);
  }

  if (!churchId) {
    throw createAppError("Church is required.", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }

  if (!actorMemberId) {
    throw createAppError("Failed to resolve active church.", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }

  if (!Array.isArray(roles) || !roles.length) {
    throw createAppError("At least one role is required.", 400, ERROR_CODES.INVALID_INPUT);
  }

  // Normalize and remove duplicates
  const normalizedRoles = [
    ...new Set(
      roles.map((role) =>
        String(role).trim().toLowerCase()
      )
    ),
  ];

  // Admin is a protected system role
  if (normalizedRoles.includes("admin")) {
    throw createAppError(
      "The admin role cannot be assigned or modified.",
      403,
      ERROR_CODES.FORBIDDEN
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /*
     * Lock the target member and verify
     * they belong to the current church.
     */
    const { rows: members } = await client.query(
      `
      SELECT
        m.id,
        m.profile_id
      FROM members m
      WHERE m.id = $1
        AND m.church_id = $2
      FOR UPDATE;
      `,
      [memberId, churchId]
    );

    if (!members.length) {
      throw createAppError("Member not found.", 404, ERROR_CODES.MEMBER_NOT_FOUND);
    }

    const member = members[0];

    /*
     * Prevent an admin from modifying
     * their own roles.
     */
    if (member.id === actorMemberId) {
      throw createAppError(
        "Admins cannot modify their own roles.",
        400,
        ERROR_CODES.INVALID_OPERATION
      );
    }

    /*
     * Check whether the target member
     * currently has the protected admin role.
     */
    const { rows: adminRole } = await client.query(
      `
      SELECT 1
      FROM member_roles mr
      JOIN roles r
        ON r.id = mr.role_id
      WHERE mr.member_id = $1
        AND LOWER(r.name) = 'admin'
      LIMIT 1;
      `,
      [memberId]
    );

    if (adminRole.length) {
      throw createAppError(
        "The admin role cannot be modified.",
        403,
        ERROR_CODES.FORBIDDEN
      );
    }

    /*
     * Validate requested roles.
     */
    const { rows: dbRoles } = await client.query(
      `
      SELECT id, name
      FROM roles
      WHERE LOWER(name) = ANY($1::text[])
        AND LOWER(name) != 'admin';
      `,
      [normalizedRoles]
    );

    if (dbRoles.length !== normalizedRoles.length) {
      throw createAppError(
        "One or more roles are invalid.",
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }

    const roleMap = new Map(
      dbRoles.map((role) => [
        role.name.toLowerCase(),
        role.id,
      ])
    );

    /*
     * Replace existing roles.
     */
    await client.query(
      `
      DELETE FROM member_roles
      WHERE member_id = $1;
      `,
      [memberId]
    );

    /*
     * Insert new roles.
     */
    for (const role of normalizedRoles) {
      await client.query(
        `
        INSERT INTO member_roles (
          member_id,
          role_id
        )
        VALUES ($1, $2);
        `,
        [
          memberId,
          roleMap.get(role),
        ]
      );
    }

    await notifyUser({
      userId: member.profile_id,
      churchId,
      type: "role_update",
      title: "Roles Updated",
      message:
        "Your church roles have been updated.",
      relatedId: memberId,
      relatedType: "member",
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}