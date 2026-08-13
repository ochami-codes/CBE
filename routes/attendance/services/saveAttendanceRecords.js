// attendanceRecords.service.js

export async function saveAttendanceRecords(
  client,
  {
    sessionId,
    records = [],
  }
) {
  await client.query(
    `
    DELETE FROM attendance
    WHERE session_id = $1
    `,
    [sessionId]
  );

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
        record.remarks?.trim() || null,
      ]
    );
  }

  return {
    sessionId,
    saved: records.length,
  };
}

