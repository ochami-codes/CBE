import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";
import { notifyRoles } from "../../../services/notifications/notifyRoles.js";
import {
  sanitizeChurchBaseName,
  buildFullChurchName,
} from "../../../utils/church.js";

export async function createClerkTransfer({
  memberId,
  sourceChurchId,
  destinationChurchId,
  externalChurchName,
  conferenceId,
  reason,
  processedBy,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /* -------------------------
       Validation
    ------------------------- */
    if (!memberId) {
      throw createAppError("memberId is required", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
    if (!sourceChurchId) {
      throw createAppError("sourceChurchId is required", 400, ERROR_CODES.MISSING_REQUIRED_FIELD);
    }

    const hasInternal = Boolean(destinationChurchId);
    const hasExternal = Boolean(externalChurchName);

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

    /* -------------------------
       Internal Transfer Checks
    ------------------------- */
    if (hasInternal) {
      if (destinationChurchId === sourceChurchId) {
        throw createAppError(
          "Destination church must be different from source church",
          400,
          ERROR_CODES.INVALID_INPUT
        );
      }

      const { rows } = await client.query(
        `SELECT conference_id FROM churches WHERE id = $1`,
        [destinationChurchId]
      );
      if (!rows.length) {
        throw createAppError("Destination church not found", 404, ERROR_CODES.CHURCH_NOT_FOUND);
      }
      conferenceId = rows[0].conference_id;
    }

    /* -------------------------
       External Transfer Checks
    ------------------------- */
    let normalizedExternalChurch = null;
    if (hasExternal) {
      if (!conferenceId) {
        throw createAppError(
          "conferenceId is required for external transfers",
          400,
          ERROR_CODES.MISSING_REQUIRED_FIELD
        );
      }

      const { rows } = await client.query(
        `SELECT id FROM conferences WHERE id = $1`,
        [conferenceId]
      );
      if (!rows.length) {
        throw createAppError("Invalid conference", 400, ERROR_CODES.INVALID_INPUT);
      }

      normalizedExternalChurch = buildFullChurchName(
        sanitizeChurchBaseName(externalChurchName)
      );
    }

    /* -------------------------
       Prevent Duplicate Requests
    ------------------------- */
    const existing = await client.query(
      `SELECT id FROM transfers WHERE member_id = $1 AND status = 'requested' LIMIT 1`,
      [memberId]
    );
    if (existing.rows.length) {
      throw createAppError(
        "Member already has a pending transfer request",
        409,
        ERROR_CODES.ALREADY_EXISTS
      );
    }
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
    "Church admins cannot be transferred. Please remove the admin role first.",
    403,
    ERROR_CODES.FORBIDDEN
  );
}
    /* -------------------------
       Insert Transfer
    ------------------------- */
    let transfer;
    if (hasInternal) {
      const { rows } = await client.query(
        `
        INSERT INTO transfers (
          member_id,
          transfer_type,
          source_church_id,
          destination_church_id,
          conference_id,
          status,
          source_approved_by,
          source_approved_at,
          reason,
          destination_type
        )
        VALUES (
          $1,'transfer_out',$2,$3,$4,
          'pending_destination',
          $5,
          NOW(),
          $6,
          'internal'
        )
        RETURNING *
        `,
        [memberId, sourceChurchId, destinationChurchId, conferenceId, processedBy, reason]
      );
      transfer = rows[0];

      await client.query(
        `INSERT INTO transfer_logs (transfer_id, action, notes, changed_by)
         VALUES ($1,'source_approved',$2,$3)`,
        [transfer.id, reason, processedBy]
      );

      await notifyRoles({
        client,
        churchId: destinationChurchId,
        roles: ["admin", "clerk"],
        type: "transfer_pending",
        title: "Member Transfer Pending",
        message: "A membership transfer has been initiated and is awaiting your approval.",
        relatedId: transfer.id,
        relatedType: "transfer",
      });
    } else {
      const { rows } = await client.query(
        `
        INSERT INTO transfers (
          member_id,
          transfer_type,
          source_church_id,
          external_church_name,
          conference_id,
          status,
          source_approved_by,
          source_approved_at,
          destination_approved_at,
          completed_at,
          reason,
          destination_type
        )
        VALUES (
          $1,'transfer_out',$2,$3,$4,
          'completed',
          $5,
          NOW(),
          NOW(),
          NOW(),
          $6,
          'external'
        )
        RETURNING *
        `,
        [memberId, sourceChurchId, normalizedExternalChurch, conferenceId, processedBy, reason]
      );
      transfer = rows[0];

      await client.query(
        `UPDATE members SET status = 'transferred', updated_at = NOW() WHERE id = $1`,
        [memberId]
      );

      await client.query(
        `INSERT INTO transfer_logs (transfer_id, action, notes, changed_by)
         VALUES ($1,'completed_external',$2,$3)`,
        [transfer.id, reason || "External transfer completed", processedBy]
      );
    }

    await client.query("COMMIT");
    return transfer;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

