import { pool } from "../../../db.js";

export async function getAttendance({
  churchId,
  departmentId,
  limit = 4,
}) {
  const { rows } = await pool.query(
    `
    SELECT
      s.id,
      s.attendance_date,
      s.title,
      s.service_type,

      s.member_count,
      s.child_count,
      s.youth_count,

      p.full_name AS recorded_by

    FROM attendance_sessions s

    LEFT JOIN profiles p
      ON p.id = s.recorded_by

    WHERE
      s.church_id = $1
      AND s.department_id = $2

    ORDER BY
      s.attendance_date DESC

    LIMIT $3
    `,
    [churchId, departmentId, limit]
  );

  return rows.map((row) => ({
    id: row.id,
    attendanceDate: row.attendance_date,
    title: row.title,
    serviceType: row.service_type,

    memberCount: row.member_count,
    childCount: row.child_count,
    youthCount: row.youth_count,

    recordedBy: row.recorded_by,
  }));
}