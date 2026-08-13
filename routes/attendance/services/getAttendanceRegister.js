import { pool } from "../../../db.js";

export async function getAttendanceRegister({
  churchId,
  departmentId,
  attendanceDate,
}) {
  const { rows } = await pool.query(
    `
    SELECT
      a.id,
      a.member_id,
      a.child_id,
      a.status,
      a.remarks,

      s.id AS session_id,
      s.attendance_date,
      s.title,
      s.service_type,

      p.full_name AS member_name,
      c.full_name AS child_name

    FROM attendance a

    JOIN attendance_sessions s
      ON s.id = a.session_id

    LEFT JOIN members m
      ON m.id = a.member_id

    LEFT JOIN profiles p
      ON p.id = m.profile_id

    LEFT JOIN children c
      ON c.id = a.child_id

    WHERE
      s.church_id = $1
      AND s.department_id = $2
      AND s.attendance_date = $3

    ORDER BY
      COALESCE(
        p.full_name,
        c.full_name
      ) ASC
    `,
    [
      churchId,
      departmentId,
      attendanceDate,
    ]
  );

  return rows.map((record) => ({
    id: record.id,

    sessionId:
      record.session_id,

    attendanceDate:
      record.attendance_date,

    title:
      record.title,

    serviceType:
      record.service_type,

    memberId:
      record.member_id,

    childId:
      record.child_id,

    full_name:
      record.member_name ??
      record.child_name,

    status:
      record.status,

    present:
      record.status === "present",

    remarks:
      record.remarks ?? "",
  }));
}
