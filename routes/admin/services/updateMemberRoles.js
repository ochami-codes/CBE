import { pool } from "../../../db.js";
import { notifyUser } from "../../../services/notifications/notifyUser.js";

export async function updateMemberRoles({
  memberId,
  churchId,
  roles,
}) {
  if (!memberId) {
    throw new Error("Member is required.");
  }

  if (!churchId) {
    throw new Error("Church is required.");
  }

  if (!Array.isArray(roles) || !roles.length) {
    throw new Error("At least one role is required.");
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
      throw new Error("Member not found.");
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
      throw new Error("One or more roles are invalid.");
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
      message: `Your church roles have been updated. Your primary role is now.`,
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