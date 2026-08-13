import { AttendanceService } from "./attendance.service.js";

export const AttendanceController = {
  async getAttendance(req, res, next) {
    try {
      const attendance =
        await AttendanceService.getAttendance({
          churchId:
            req.user.active_church_id,
          departmentId: req.query.departmentId,
          attendanceDate: req.query.attendanceDate,  
        });

      res.json(attendance);
    } catch (error) {
      next(error);
    }
  },

async saveAttendance(req, res, next) {
  try {
    const payload = {
      churchId:
        req.user.active_church_id,

      departmentId:
        req.body.departmentId,

      attendanceDate:
        req.body.attendanceDate,

      title:
        req.body.title,

      serviceType:
        req.body.serviceType,

      recordedBy:
        req.user.id,

      memberCount:
        req.body.memberCount,

      childCount:
        req.body.childCount,

      youthCount:
        req.body.youthCount,

      records:
        req.body.records,
    };

    const attendance =
      await AttendanceService.saveAttendance(
        payload
      );

    res.status(201).json(attendance);
  } catch (error) {
    next(error);
  }
  },
};
