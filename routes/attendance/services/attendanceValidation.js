// departmentAttendance.validation.js

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

/*
 * Validate the complete department attendance payload.
 */
export function validateAttendance({
  churchId,
  departmentId,
  attendanceDate,
  title,
  serviceType,
  recordedBy,
  records = [],
}) {
  validateRequiredFields({
    churchId,
    departmentId,
    attendanceDate,
    recordedBy,
  });

  validateSessionFields({
    title,
    serviceType,
  });

  validateRecords(records);
}

/*
 * Required fields
 */
function validateRequiredFields({
  churchId,
  departmentId,
  attendanceDate,
  recordedBy,
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
}

/*
 * Session-related fields
 */
function validateSessionFields({
  title,
  serviceType,
}) {
  if (
    title !== undefined &&
    title !== null &&
    typeof title !== "string"
  ) {
    throw createAppError(
      "Title must be a string.",
      400,
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  if (
    typeof title === "string" &&
    title.trim().length > 255
  ) {
    throw createAppError(
      "Title cannot exceed 255 characters.",
      400,
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  if (
    serviceType !== undefined &&
    serviceType !== null &&
    !VALID_SERVICE_TYPES.includes(serviceType)
  ) {
    throw createAppError(
      "Invalid service type.",
      400,
      ERROR_CODES.VALIDATION_ERROR
    );
  }
}

/*
 * Individual attendance records
 */
function validateRecords(records) {
  if (!Array.isArray(records)) {
    throw createAppError(
      "Attendance records must be an array.",
      400,
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const seen = new Set();

  for (const [index, record] of records.entries()) {
    if (
      !record ||
      typeof record !== "object" ||
      Array.isArray(record)
    ) {
      throw createAppError(
        `Invalid attendance record ${index + 1}.`,
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const hasMember = Boolean(
      record.memberId
    );

    const hasChild = Boolean(
      record.childId
    );

    /*
     * Exactly one subject is required.
     *
     * Valid:
     *   memberId only
     *   childId only
     *
     * Invalid:
     *   neither
     *   both
     */
    if (hasMember === hasChild) {
      throw createAppError(
        `Attendance record ${index + 1} must contain either a member or a child.`,
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    /*
     * Validate attendance status.
     */
    if (
      !VALID_STATUSES.includes(record.status)
    ) {
      throw createAppError(
        `Invalid attendance status in record ${index + 1}.`,
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    /*
     * Validate remarks.
     */
    if (
      record.remarks !== undefined &&
      record.remarks !== null &&
      typeof record.remarks !== "string"
    ) {
      throw createAppError(
        `Remarks in attendance record ${index + 1} must be text.`,
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (
      typeof record.remarks === "string" &&
      record.remarks.trim().length > 1000
    ) {
      throw createAppError(
        `Remarks in attendance record ${index + 1} cannot exceed 1000 characters.`,
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    /*
     * Prevent the same member/child from appearing
     * more than once in the same register.
     */
    const key = hasMember
      ? `member:${record.memberId}`
      : `child:${record.childId}`;

    if (seen.has(key)) {
      throw createAppError(
        `Duplicate attendance record detected for ${hasMember ? "member" : "child"}.`,
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    seen.add(key);
  }
}
