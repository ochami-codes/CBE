import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function updateMember({
  churchId,
  memberId,
  payload,
  updatedBy,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { profile, member_record, member } =
      payload;

    /* =========================
       1. VERIFY MEMBER EXISTS
    ========================== */

    const existingMemberResult = await client.query(
      `
      SELECT *
      FROM members
      WHERE id = $1
      AND church_id = $2
      LIMIT 1
      `,
      [memberId, churchId]
    );

    if (existingMemberResult.rows.length === 0) {
      throw createAppError("Member not found", 404, ERROR_CODES.NOT_FOUND);
    }

    const existingMember =
      existingMemberResult.rows[0];

    /* =========================
       2. UPDATE PROFILE (if provided)
    ========================== */

    let updatedProfile = null;

    if (profile && Object.keys(profile).length > 0) {
      const profileFields = Object.keys(profile)
        .filter((k) => profile[k] !== undefined)
        .map((k, i) => `${k} = $${i + 2}`)
        .join(", ");

      const profileValues = [
        existingMember.profile_id,
        ...Object.values(profile),
      ];

      const profileResult = await client.query(
        `
        UPDATE profiles
        SET ${profileFields}
        WHERE id = $1
        RETURNING *
        `,
        profileValues
      );

      updatedProfile = profileResult.rows[0];
    }

    /* =========================
       3. UPDATE MEMBER
    ========================== */

    let updatedMember = existingMember;

    if (member && Object.keys(member).length > 0) {
      const memberFields = Object.keys(member)
        .filter((k) => member[k] !== undefined)
        .map((k, i) => `${k} = $${i + 2}`)
        .join(", ");

      const memberValues = [
        memberId,
        ...Object.values(member),
      ];

      const memberResult = await client.query(
        `
        UPDATE members
        SET ${memberFields}
        WHERE id = $1
        RETURNING *
        `,
        memberValues
      );

      updatedMember = memberResult.rows[0];
    }

    /* =========================
       4. UPDATE MEMBER RECORD
    ========================== */

    let updatedRecord = null;

    if (
      member_record &&
      Object.keys(member_record).length > 0
    ) {
      const recordFields = Object.keys(member_record)
        .filter((k) => member_record[k] !== undefined)
        .map((k, i) => `${k} = $${i + 2}`)
        .join(", ");

      const recordValues = [
        memberId,
        ...Object.values(member_record),
      ];

      const recordResult = await client.query(
        `
        UPDATE member_records
        SET ${recordFields}
        WHERE member_id = $1
        RETURNING *
        `,
        recordValues
      );

      updatedRecord = recordResult.rows[0];
    }

    /* =========================
       COMMIT
    ========================== */

    await client.query("COMMIT");

    return {
      profile: updatedProfile,
      member: updatedMember,
      member_record: updatedRecord,
      updated_by: updatedBy,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}