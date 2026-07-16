import { pool } from "../../../db.js";
import {
  normalizeKenyanPhone,
  isValidKenyanPhone,
} from "../../../utils/phone.js";
import  { toNameCase } from "../../../utils/formatters.js";

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
    throw new Error("Lesson type is required.");
  }

  if (!year) {
    throw new Error("Year is required.");
  }

  if (!quarter) {
    throw new Error("Quarter is required.");
  }

  const hasMember = Boolean(memberId);

  let normalizedName = null;
  let normalizedPhone = null;

  if (!hasMember) {
    if (!nameOverride?.trim()) {
      throw new Error("Name is required.");
    }

    if (!phoneNumber?.trim()) {
      throw new Error("Phone number is required.");
    }

    normalizedName = toNameCase(nameOverride);

    if (!isValidKenyanPhone(phoneNumber)) {
      throw new Error("Invalid Kenyan phone number.");
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
      throw new Error("Member not found.");
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
    throw new Error(
      "This person is already subscribed for this quarter."
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