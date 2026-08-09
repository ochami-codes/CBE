import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";
import { notifyRoles } from "../../../services/notifications/notifyRoles.js";
import {
  sanitizeChurchBaseName,
  buildFullChurchName
} from "../../../utils/church.js";
export async function createTransferRequest({
  memberId,
  profileId,
  sourceChurchId,
  destinationChurchId,
  externalChurchName,
  conferenceId, // only for external transfers
  reason,
  requestedBy,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /* =========================
       1. BASIC VALIDATION
    ========================== */

    if (!memberId) throw createAppError("memberId is required", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
    if (!profileId) throw createAppError("profileId is required", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
    if (!sourceChurchId) throw createAppError("sourceChurchId is required", 400, ERROR_CODES.MISSING_REQUIRED_FIELD);

    const hasInternal = !!destinationChurchId;
    const hasExternal = !!externalChurchName;
    const destinationType = hasInternal
      ? "internal"
      : "external";

    if (hasInternal && hasExternal) {
      throw createAppError(
        "Cannot specify both internal and external destination",
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }

    if (!hasInternal && !hasExternal) {
      throw createAppError("Destination is required", 400, ERROR_CODES.MISSING_REQUIRED_FIELD);
    }

    /* =========================
       2. INTERNAL TRANSFER FLOW
    ========================== */

    if (hasInternal) {
      if (destinationChurchId === sourceChurchId) {
        throw createAppError(
          "Destination church must be different from source church",
          400,
          ERROR_CODES.INVALID_INPUT
        );
      }

      const churchCheck = await client.query(
        `
        SELECT conference_id
        FROM churches
        WHERE id = $1
        `,
        [destinationChurchId]
      );

      if (!churchCheck.rows.length) {
        throw createAppError("Destination church not found", 404, ERROR_CODES.CHURCH_NOT_FOUND);
      }

      conferenceId = churchCheck.rows[0].conference_id;
    }

    /* =========================
       3. EXTERNAL TRANSFER FLOW
    ========================== */

    let normalizedExternalChurch = null;

    if (hasExternal) {
      if (!externalChurchName) {
        throw createAppError(
          "externalChurchName is required",
          400,
          ERROR_CODES.MISSING_REQUIRED_FIELD
        );
      }

      if (!conferenceId) {
        throw createAppError(
          "conferenceId is required for external transfers",
          400,
          ERROR_CODES.MISSING_REQUIRED_FIELD
        );
      }

      const confCheck = await client.query(
        `
        SELECT id
        FROM conferences
        WHERE id = $1
        `,
        [conferenceId]
      );

      if (!confCheck.rows.length) {
        throw createAppError("Invalid conference", 400, ERROR_CODES.INVALID_INPUT);
      }

      const baseName =
        sanitizeChurchBaseName(
          externalChurchName
        );

      normalizedExternalChurch =
        buildFullChurchName(baseName);
    }
    /* =========================
   4. BLOCK ADMIN TRANSFERS
========================== */

const adminRole = await client.query(
  `
  SELECT 1
  FROM member_roles mr
  JOIN roles r
    ON r.id = mr.role_id
  WHERE mr.member_id = $1
    AND LOWER(r.name) = 'admin'
  LIMIT 1
  `,
  [memberId]
);

if (adminRole.rows.length > 0) {
  throw createAppError(
    "Church administrators cannot request membership transfers. Please transfer or remove the administrative role first.",
    403,
    ERROR_CODES.FORBIDDEN
  );
}

    /* =========================
       5. PREVENT DUPLICATE TRANSFERS
    ========================== */

    const existingTransfer = await client.query(
      `
      SELECT id
      FROM transfers
      WHERE member_id = $1
        AND status = 'requested'
      LIMIT 1
      `,
      [memberId]
    );

    if (existingTransfer.rows.length > 0) {
      throw createAppError(
        "Member already has a pending transfer request",
        409,
        ERROR_CODES.ALREADY_EXISTS
      );
    }

    /* =========================
       6. INSERT TRANSFER
    ========================== */

    const result = await client.query(
      `
      INSERT INTO transfers (
        member_id,
        profile_id,
        transfer_type,
        source_church_id,
        destination_church_id,
        external_church_name,
        conference_id,
        status,
        reason,
        requested_by,
        destination_type
      )
      VALUES (
        $1,$2,'transfer_out',$3,$4,$5,$6,'requested',$7,$8,$9
      )
      RETURNING *
      `,
      [
        memberId,
        profileId,
        sourceChurchId,
        destinationChurchId || null,
        normalizedExternalChurch,
        conferenceId || null,
        reason,
        requestedBy,
        destinationType
      ]
    );
    const transfer = result.rows[0];

await notifyRoles({
  client,
  churchId: sourceChurchId,
  roles: ["admin", "clerk"],
  type: "transfer_request",
  title: "New Transfer Request",
  message: "A new membership transfer request has been submitted.",
  relatedId: transfer.id,
  relatedType: "transfer",
});
    await client.query("COMMIT");

    return result.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
