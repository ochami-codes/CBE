import { pool } from "../../../db.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";
import { createAppError } from "../../../errors/AppError.js";
export async function approveDestination({
  transferId,
  processedBy,
  notes = null,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /* =========================
       LOCK TRANSFER
    ========================= */
    const result = await client.query(
      `
      SELECT *
      FROM transfers
      WHERE id = $1
      FOR UPDATE
      `,
      [transferId]
    );

    const transfer = result.rows[0];

    if (!transfer) {
      throw createAppError("Transfer not found", 400, ERROR_CODES.NOT_FOUND);
    }

    if (transfer.status !== "pending_destination") {
      throw createAppError(
        `Cannot complete a ${transfer.status} transfer`,
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }

    /* =========================
       COMPLETE TRANSFER
    ========================= */
    const completed = await client.query(
      `
      UPDATE transfers
      SET
        status = 'completed',
        destination_approved_by = $1,
        destination_approved_at = NOW(),
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
      `,
      [processedBy, transferId]
    );

    /* =========================
       UPDATE MEMBER RECORD
    ========================= */
    await client.query(
      `
      UPDATE members
      SET
        church_id = $1,
        status = 'active',
        updated_at = NOW()
      WHERE id = $2
      `,
      [
        transfer.destination_church_id,
        transfer.member_id,
      ]
    );

    /* =========================
       AUDIT LOG
    ========================= */
    await client.query(
      `
      INSERT INTO transfer_logs (
        transfer_id,
        action,
        notes,
        changed_by
      )
      VALUES ($1, 'destination_approved', $2, $3)
      `,
      [
        transferId,
        notes || "Transfer completed by destination church",
        processedBy,
      ]
    );

    await client.query("COMMIT");

    return completed.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}