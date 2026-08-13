import { pool } from "../../../db.js";

import {
  validateAttendance,
} from "./attendanceValidation.js";

import {
  saveAttendanceSession,
} from "./saveAttendanceSession.js";

import {
  saveAttendanceRecords,
} from "./saveAttendanceRecords.js";

export async function saveAttendance(payload) {
  validateAttendance(payload);

  const client = await pool.connect();
   const { 
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
} = payload;
  try {
    await client.query("BEGIN");

    const sessionId =
      await saveAttendanceSession(
        client,
        churchId,
        departmentId,
        attendanceDate,
        title,
        serviceType,
        recordedBy,
        memberCount,
        childCount,
        youthCount,
      );

    const result =
      await saveAttendanceRecords(
        client,
        {
          sessionId,
          records,
        }
      );

    await client.query("COMMIT");

    return {
      sessionId,
      saved: result.saved,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}