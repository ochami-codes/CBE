import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function approveSource({
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

    if (transfer.status !== "requested") {
      throw createAppError(
        `Cannot approve a ${transfer.status} transfer`,
        422,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const isExternal =
      transfer.transfer_type === "external" ||
      transfer.destination_type === "external";

    /* =========================
       INTERNAL FLOW
       (send to destination church)
    ========================= */
    if (!isExternal) {
      const updated = await client.query(
        `
        UPDATE transfers
        SET
          status = 'pending_destination',
          source_approved_by = $1,
          source_approved_at = NOW(),
          updated_at = NOW()
        WHERE id = $2
        RETURNING *
        `,
        [processedBy, transferId]
      );

      await client.query(
        `
        INSERT INTO transfer_logs (
          transfer_id,
          action,
          notes,
          changed_by
        )
        VALUES ($1, 'source_approved', $2, $3)
        `,
        [transferId, notes, processedBy]
      );

      await client.query("COMMIT");
      return updated[0];
    }

    /* =========================
       EXTERNAL FLOW
       (complete immediately)
    ========================= */

    // update transfer as completed
    const completed = await client.query(
      `
      UPDATE transfers
      SET
        status = 'completed',
        source_approved_by = $1,
        source_approved_at = NOW(),
        destination_approved_at = NOW(),
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
      `,
      [processedBy, transferId]
    );

    // update member record (exit local church)
    await client.query(
      `
      UPDATE members
      SET
        status = 'transferred',
        updated_at = NOW()
      WHERE id = $1
      `,
      [transfer.member_id]
    );

    // logs
    await client.query(
      `
      INSERT INTO transfer_logs (
        transfer_id,
        action,
        notes,
        changed_by
      )
      VALUES ($1, 'completed_external', $2, $3)
      `,
      [transferId, notes || "External transfer completed", processedBy]
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