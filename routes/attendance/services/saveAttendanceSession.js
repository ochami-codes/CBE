// attendanceSession.service.js

export async function saveAttendanceSession(
    client,
    churchId,
    departmentId,
    attendanceDate,
    title,
    serviceType,
    recordedBy,
    memberCount = 0,
    childCount = 0,
    youthCount = 0,
) {
  const existing = await client.query(
    `
    SELECT id
    FROM attendance_sessions
    WHERE
      church_id = $1
      AND department_id = $2
      AND attendance_date = $3
    FOR UPDATE
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
        title?.trim() || null,
        serviceType ?? null,
        recordedBy,
        memberCount,
        childCount,
        youthCount,
      ]
    );
  } else {
    const result = await client.query(
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
        title?.trim() || null,
        serviceType ?? null,
        recordedBy,
        memberCount,
        childCount,
        youthCount,
      ]
    );

    sessionId = result.rows[0].id;
  }

  return sessionId;
}