import { pool } from "../../../db.js";
import { notifyUser } from "../../../services/notifications/notifyUser.js";

import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function updateMemberRoles({
  memberId,
  churchId,
  roles,
}) {
  if (!memberId) {
    throw createAppError(
      "Member is required.",
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD
    );
  }

  if (!churchId) {
    throw createAppError(
      "Church is required.",
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD
    );
  }

  if (!Array.isArray(roles) || !roles.length) {
    throw createAppError(
      "At least one role is required.",
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

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
      throw createAppError(
        "Member not found.",
        404,
        ERROR_CODES.MEMBER_NOT_FOUND
      );
    }

    const member = members[0];

    const { rows: dbRoles } = await client.query(
      `
      SELECT id, name
      FROM roles
      WHERE LOWER(name) = ANY($1::text[]);
      `,
      [roles.map((r) => r.toLowerCase())]
    );

    if (dbRoles.length !== roles.length) {
      throw createAppError(
        "One or more roles are invalid.",
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }

    const roleMap = new Map(
      dbRoles.map((r) => [
        r.name.toLowerCase(),
        r.id,
      ])
    );

    await client.query(
      `
      DELETE
      FROM member_roles
      WHERE member_id = $1;
      `,
      [memberId]
    );

    for (const role of roles) {
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
          roleMap.get(role.toLowerCase()),
        ]
      );
    }

    await notifyUser({
      userId: member.profile_id,
      churchId,
      type: "role_update",
      title: "Roles Updated",
      message: "Your church roles have been updated.",
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