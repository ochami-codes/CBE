import { pool } from "../../../db.js";

export async function saveAttendance({
  churchId,
  departmentId,
  attendanceDate,
  title,
  serviceType,
  recordedBy,

  memberCount = 0,
  childCount = 0,
  youthCount = 0,

  records = [],
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `
      SELECT id
      FROM attendance_sessions
      WHERE
        church_id = $1
        AND department_id = $2
        AND attendance_date = $3
      `,
      [
        churchId,
        departmentId,
        attendanceDate,
      ]
    );

    let sessionId;

    if (existing.rowCount > 0) {
      sessionId = existing.rows[0].id;

      await client.query(
        `
        DELETE FROM attendance
        WHERE session_id = $1
        `,
        [sessionId]
      );

      await client.query(
        `
        UPDATE attendance_sessions

        SET
          title = $2,
          service_type = $3,
          recorded_by = $4,
          member_count = $5,
          child_count = $6,
          youth_count = $7,
          updated_at = NOW()

        WHERE id = $1
        `,
        [
          sessionId,
          title,
          serviceType,
          recordedBy,
          memberCount,
          childCount,
          youthCount,
        ]
      );
    } else {
      const session = await client.query(
        `
        INSERT INTO attendance_sessions (
          church_id,
          department_id,
          attendance_date,
          title,
          service_type,
          recorded_by,
          member_count,
          child_count,
          youth_count
        )

        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9
        )

        RETURNING id
        `,
        [
          churchId,
          departmentId,
          attendanceDate,
          title,
          serviceType,
          recordedBy,
          memberCount,
          childCount,
          youthCount,
        ]
      );

      sessionId = session.rows[0].id;
    }

    if (records.length > 0) {
      for (const record of records) {
        await client.query(
          `
          INSERT INTO attendance (
            session_id,
            member_id,
            child_id,
            status,
            remarks
          )

          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5
          )
          `,
          [
            sessionId,
            record.memberId ?? null,
            record.childId ?? null,
            record.status,
            record.remarks ?? null,
          ]
        );
      }
    }

    await client.query("COMMIT");

    return {
      sessionId,
      saved: records.length,
      summary: {
        memberCount,
        childCount,
        youthCount,
      },
    };

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;

  } finally {
    client.release();
  }
}