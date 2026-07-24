import { pool } from "../../../db.js";
import { notifyUser } from "./notificationService.js";

export async function updateMemberRoles({
  memberId,
  churchId,
  actorMemberId,
  roles,
}) {
  if (!memberId) {
    throw new Error("Member is required.");
  }

  if (!churchId) {
    throw new Error("Church is required.");
  }

  if (!actorMemberId) {
    throw new Error("Authenticated member is required.");
  }

  if (!Array.isArray(roles) || !roles.length) {
    throw new Error("At least one role is required.");
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
    throw new Error(
      "The admin role cannot be assigned or modified."
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
      throw new Error("Member not found.");
    }

    const member = members[0];

    /*
     * Prevent an admin from modifying
     * their own roles.
     */
    if (member.id === actorMemberId) {
      throw new Error(
        "Admins cannot modify their own roles."
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
      throw new Error(
        "The admin role cannot be modified."
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
      throw new Error(
        "One or more roles are invalid."
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