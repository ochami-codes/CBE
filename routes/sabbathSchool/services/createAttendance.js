import { pool } from "../../../db.js";

export async function createAttendance({
  churchId,
  recordedBy,
  attendanceDate,
  memberCount = 0,
  youthCount = 0,
  childCount = 0,
  title = "Sabbath School",
  serviceType = "Sabbath School",
  departmentId
}) {
  const { rows } = await pool.query(
    `
    INSERT INTO attendance_sessions (
      church_id,
      attendance_date,
      title,
      service_type,
      member_count,
      youth_count,
      child_count,
      recorded_by,
      department_id
    )
    VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8, $9
    )
    RETURNING
      id,
      attendance_date,
      title,
      service_type,
      member_count,
      youth_count,
      child_count,
      recorded_by
    `,
    [
      churchId,
      attendanceDate,
      title,
      serviceType,
      memberCount,
      youthCount,
      childCount,
      recordedBy,
      departmentId,
    ]
  );

  const row = rows[0];

  return {
    id: row.id,
    attendanceDate: row.attendance_date,
    title: row.title,
    serviceType: row.service_type,
    memberCount: row.member_count,
    youthCount: row.youth_count,
    childCount: row.child_count,
    recordedBy: row.recorded_by,
  };
}