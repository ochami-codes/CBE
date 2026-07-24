// services/church.service.js

import { pool } from "../../../db.js";
import { getOrCreateChurch } from "../../../services/churchService.js";

export async function createChurch({
  profileId,
  churchName,
  conferenceId,
}) {
  if (!profileId) {
    throw new Error("User is required.");
  }

  if (!churchName?.trim()) {
    throw new Error("Church name is required.");
  }

  if (!conferenceId) {
    throw new Error("Conference is required.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /* ---------------- GET OR CREATE CHURCH ---------------- */

    const church = await getOrCreateChurch({
      client,
      churchName: churchName.trim(),
      conferenceId,
    });

    /* ---------------- CHECK WHETHER CHURCH HAS MEMBERS ---------------- */

    const { rows: countRows } = await client.query(
      `
      SELECT COUNT(*)::int AS count
      FROM members
      WHERE church_id = $1;
      `,
      [church.id]
    );

    const isFirstUser = countRows[0].count === 0;

    /* ---------------- FIRST USER BECOMES ADMIN ---------------- */

    if (isFirstUser) {
      const { rows: memberRows } = await client.query(
        `
        INSERT INTO members (
          profile_id,
          church_id,
          status
        )
        VALUES ($1, $2, 'active')
        RETURNING id;
        `,
        [profileId, church.id]
      );

      const memberId = memberRows[0].id;

      const { rows: roleRows } = await client.query(
        `
        SELECT id
        FROM roles
        WHERE LOWER(name) = 'admin'
        LIMIT 1;
        `
      );

      if (!roleRows.length) {
        throw new Error("Admin role not found.");
      }

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
          roleRows[0].id,
        ]
      );
    }

    /* ---------------- SET ACTIVE CHURCH ---------------- */

    await client.query(
      `
      UPDATE profiles
      SET active_church_id = $1
      WHERE id = $2;
      `,
      [
        church.id,
        profileId,
      ]
    );

    await client.query("COMMIT");

    return {
      message: isFirstUser
        ? "Church created successfully. You have been assigned as the administrator."
        : "Church selected successfully. Your membership is pending approval.",
      church,
      role: isFirstUser
        ? "admin"
        : "guest",
      isFirstUser,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}