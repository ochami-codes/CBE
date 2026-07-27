import { pool } from "../../../db.js";
import {
  normalizeKenyanPhone,
  isValidKenyanPhone,
} from "../../../utils/phone.js";
import  { toNameCase } from "../../../utils/formatters.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function createLessonGuide({
  churchId,
  createdBy,
  memberId,
  nameOverride,
  phoneNumber,
  lessonType,
  year,
  quarter,
  remarks,
}) {
  // -------------------------
  // Validate required fields
  // -------------------------
  if (!lessonType) {
    throw createAppError("Lesson type is required.", 400, ERROR_CODES.INVALID_INPUT);
  }

  if (!year) {
    throw createAppError("Year is required.", 400, ERROR_CODES.INVALID_INPUT);
  }

  if (!quarter) {
    throw createAppError("Quarter is required.", 400, ERROR_CODES.INVALID_INPUT);
  }

  const hasMember = Boolean(memberId);

  let normalizedName = null;
  let normalizedPhone = null;

  if (!hasMember) {
    if (!nameOverride?.trim()) {
      throw createAppError("Name is required.", 400, ERROR_CODES.INVALID_INPUT);
    }

    if (!phoneNumber?.trim()) {
      throw createAppError("Phone number is required.", 400, ERROR_CODES.INVALID_INPUT);
    }

    normalizedName = toNameCase(nameOverride);

    if (!isValidKenyanPhone(phoneNumber)) {
      throw createAppError("Invalid Kenyan phone number.", 400, ERROR_CODES.INVALID_INPUT);
    }

    normalizedPhone =
      normalizeKenyanPhone(phoneNumber);
  }

  // -------------------------
  // Validate member
  // -------------------------
  if (hasMember) {
    const memberResult = await pool.query(
      `
      SELECT id
      FROM members
      WHERE
        id = $1
        AND church_id = $2
      `,
      [memberId, churchId]
    );

    if (memberResult.rowCount === 0) {
      throw createAppError("Member not found.", 404, ERROR_CODES.MEMBER_NOT_FOUND);
    }
  }

  // -------------------------
  // Prevent duplicates
  // -------------------------
  const duplicateQuery = hasMember
    ? `
      SELECT id
      FROM sabbath_school_lesson_guides
      WHERE
        church_id = $1
        AND member_id = $2
        AND year = $3
        AND quarter = $4
    `
    : `
      SELECT id
      FROM sabbath_school_lesson_guides
      WHERE
        church_id = $1
        AND phone = $2
        AND year = $3
        AND quarter = $4
    `;

  const duplicateValues = hasMember
    ? [
        churchId,
        memberId,
        year,
        quarter,
      ]
    : [
        churchId,
        normalizedPhone,
        year,
        quarter,
      ];

  const existing = await pool.query(
    duplicateQuery,
    duplicateValues
  );

  if (existing.rowCount > 0) {
    throw createAppError(
      "This person is already subscribed for this quarter.",
      409,
      ERROR_CODES.DUPLICATE_ENTRY
    );
  }

  // -------------------------
  // Create subscription
  // -------------------------
  const { rows } = await pool.query(
    `
    INSERT INTO sabbath_school_lesson_guides (
      church_id,
      member_id,
      full_name,
      phone,
      lesson_type,
      year,
      quarter,
      status,
      remarks,
      created_by
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      'subscribed',
      $8,
      $9
    )
    RETURNING
      id,
      member_id,
      full_name,
      phone,
      lesson_type,
      year,
      quarter,
      status,
      remarks,
      created_at
    `,
    [
      churchId,
      memberId ?? null,
      normalizedName,
      normalizedPhone,
      lessonType,
      year,
      quarter,
      remarks ?? null,
      createdBy,
    ]
  );

  return rows[0];
}