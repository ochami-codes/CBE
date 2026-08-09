import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

const VALID_STATUSES = [
  "present",
  "absent",
];

const VALID_SERVICE_TYPES = [
  "sabbath_school",
  "divine_service",
  "vespers",
  "midweek",
  "other",
];

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
  if (!churchId) {
    throw createAppError(
      "Church is required.",
      400,
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  if (!departmentId) {
    throw createAppError(
      "Department is required.",
      400,
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  if (!attendanceDate) {
    throw createAppError(
      "Attendance date is required.",
      400,
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  if (!recordedBy) {
    throw createAppError(
      "Recorded by is required.",
      400,
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  if (
    serviceType &&
    !VALID_SERVICE_TYPES.includes(serviceType)
  ) {
    throw createAppError(
      "Invalid service type.",
      400,
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  if (
    title &&
    title.trim().length > 255
  ) {
    throw createAppError(
      "Title cannot exceed 255 characters.",
      400,
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const counts = [
    ["memberCount", memberCount],
    ["childCount", childCount],
    ["youthCount", youthCount],
  ];

  for (const [name, value] of counts) {
    if (
      !Number.isInteger(value) ||
      value < 0
    ) {
      throw createAppError(
        `${name} must be a non-negative integer.`,
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }
  }

  if (!Array.isArray(records)) {
    throw createAppError(
      "Attendance records must be an array.",
      400,
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const seen = new Set();

  for (const [index, record] of records.entries()) {
    const hasMember = !!record.memberId;
    const hasChild = !!record.childId;

    if (hasMember === hasChild) {
      throw createAppError(
        `Attendance record ${index + 1} must contain either a member or a child.`,
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (
      !VALID_STATUSES.includes(record.status)
    ) {
      throw createAppError(
        `Invalid attendance status in record ${index + 1}.`,
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const key = hasMember
      ? `member:${record.memberId}`
      : `child:${record.childId}`;

    if (seen.has(key)) {
      throw createAppError(
        "Duplicate attendance record detected.",
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    seen.add(key);
  }

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