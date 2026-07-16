import { pool } from "../../../db.js";

export async function getOfferings({
  churchId,
  departmentId,
}) {
  if (!departmentId) {
    throw new Error(
      "Department is required."
    );
  }

  const { rows } = await pool.query(
    `
    SELECT
      s.id,
      s.attendance_date,
      s.member_count,
      s.youth_count,
      s.child_count,
      agt.group_name,
      agt.offering_amount,
      p.full_name AS recorded_by
    FROM attendance_sessions s
    INNER JOIN attendance_group_totals agt
      ON agt.session_id = s.id
    LEFT JOIN profiles p
      ON p.id = s.recorded_by
    WHERE s.church_id = $1
      AND s.department_id = $2
    ORDER BY
      s.attendance_date DESC,
      agt.group_name
    `,
    [churchId, departmentId]
  );

  const sessions = new Map();

  for (const row of rows) {
    if (!sessions.has(row.id)) {
      sessions.set(row.id, {
        id: row.id,
        date: row.attendance_date,
        adults: 0,
        adultsAttendance: row.member_count,
        youth: 0,
        youthAttendance: row.youth_count,
        children: 0,
        childrenAttendance: row.child_count,
        total: 0,
        recordedBy: row.recorded_by,
      });
    }

    const session = sessions.get(row.id);

    switch (row.group_name.toLowerCase()) {
      case "adults":
        session.adults = Number(
          row.offering_amount
        );
        break;

      case "youth":
        session.youth = Number(
          row.offering_amount
        );
        break;

      case "children":
        session.children = Number(
          row.offering_amount
        );
        break;
    }

    session.total += Number(
      row.offering_amount
    );
  }

  return [...sessions.values()];
}