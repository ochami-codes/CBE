import { pool } from "../../../db.js";
import { validateMemberPayload } from "../../../utils/validators/memberValidation.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";
export async function addMember({
  churchId,
  payload,
}) {
  const validatedPayload =
    validateMemberPayload(payload);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      full_name,
      phone,
      date_of_birth,
      gender,
      baptized,
      baptismal_date,
      marital_status,
      membership_type,
      emergency_contact_name,
      emergency_contact_relationship,
      emergency_contact_phone,
    } = validatedPayload;

    /* -------------------------
       FIND EXISTING PROFILE
    ------------------------- */

    const existingProfile =
      await client.query(
        `
        SELECT id
        FROM profiles
        WHERE phone = $1
        LIMIT 1
        `,
        [phone]
      );

    let profileId;

    if (existingProfile.rowCount > 0) {
      profileId =
        existingProfile.rows[0].id;
    }

    /* -------------------------
       CREATE PROFILE
    ------------------------- */

    if (!profileId) {
      const profileResult =
        await client.query(
          `
          INSERT INTO profiles (
            full_name,
            phone,
            date_of_birth,
            gender,
            is_system_user
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            false
          )
          RETURNING id
          `,
          [
            full_name,
            phone,
            date_of_birth,
            gender,
          ]
        );

      profileId =
        profileResult.rows[0].id;
    }

    /* -------------------------
       CHECK EXISTING MEMBERSHIP
    ------------------------- */

    const memberExists =
      await client.query(
        `
        SELECT 1
        FROM members
        WHERE church_id = $1
          AND profile_id = $2
        LIMIT 1
        `,
        [
          churchId,
          profileId,
        ]
      );

    if (memberExists.rowCount > 0) {
       throw createAppError(
        "Member with the phone already exists",
        409,
        ERROR_CODES.ALREADY_EXISTS
       )
    }

    /* -------------------------
       CREATE MEMBER
    ------------------------- */

    const memberResult =
      await client.query(
        `
        INSERT INTO members (
          church_id,
          profile_id,
          status
        )
        VALUES (
          $1,
          $2,
          'active'
        )
        RETURNING *
        `,
        [
          churchId,
          profileId,
        ]
      );

    const member =
      memberResult.rows[0];

    /* -------------------------
       CREATE MEMBER RECORD
    ------------------------- */

    await client.query(
      `
      INSERT INTO member_records (
        member_id,
        baptized,
        baptismal_date,
        marital_status,
        membership_type,
        emergency_contact_name,
        emergency_contact_relationship,
        emergency_contact_phone
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8
      )
      `,
      [
        member.id,
        baptized,
        baptismal_date,
        marital_status,
        membership_type,
        emergency_contact_name,
        emergency_contact_relationship,
        emergency_contact_phone,
      ]
    );

    await client.query("COMMIT");

    return member;
  } catch (error) {
    await client.query("ROLLBACK");

    throw error;
  } finally {
    client.release();
  }
}
