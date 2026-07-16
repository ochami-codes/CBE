import { getAttendance } from "./services/getAttendance.js";
import { saveAttendance } from "./services/saveAttendance.js";

export const AttendanceService = {
  async getAttendance({
    churchId,
    query,
  }) {
    const {
      departmentId,
      date,
    } = query;

    return getAttendance({
      churchId,
      departmentId,
      date,
    });
  },

  async saveAttendance({
    churchId,
    userId,
    body,
  }) {
    const {
      departmentId,
      attendanceDate,
      records,
    } = body;

    return saveAttendance({
      churchId,
      departmentId,
      attendanceDate,
      recordedBy: userId,
      records,
    });
  },
};