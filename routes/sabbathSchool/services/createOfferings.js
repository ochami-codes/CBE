import { pool } from "../../../db.js";

export async function createOfferings({
  churchId,
  sessionId,
  groups = [],
}) {
  if (!sessionId) {
    throw new Error("Attendance session is required.");
  }

  if (!Array.isArray(groups) || groups.length === 0) {
    throw new Error(
      "At least one offering group is required."
    );
  }

  const {
    rows: [session],
  } = await pool.query(
    `
    SELECT
      id
    FROM attendance_sessions
    WHERE id = $1
      AND church_id = $2
    `,
    [sessionId, churchId]
  );

  if (!session) {
    throw new Error(
      "Attendance session not found."
    );
  }

  const { rows: existing } =
    await pool.query(
      `
      SELECT 1
      FROM attendance_group_totals
      WHERE session_id = $1
      LIMIT 1
      `,
      [sessionId]
    );

  if (existing.length > 0) {
    throw new Error(
      "Offerings have already been recorded for this session."
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const group of groups) {
      if (!group.groupName) {
        throw new Error(
          "Group name is required."
        );
      }

      await client.query(
        `
        INSERT INTO attendance_group_totals (
          session_id,
          group_name,
          offering_amount
        )
        VALUES ($1, $2, $3)
        `,
        [
          sessionId,
          group.groupName,
          group.offeringAmount ?? 0,
        ]
      );
    }

    await client.query("COMMIT");

    return {
      sessionId,
      groupsRecorded: groups.length,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}