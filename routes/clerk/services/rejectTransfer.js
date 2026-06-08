import { pool } from "../../../db.js";

export async function rejectTransfer({
  transferId,
  processedBy,
  notes = null,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /* =========================
       LOCK & LOAD TRANSFER
    ========================= */
    const transferResult =
      await client.query(
        `
        SELECT
          t.*,
          m.profile_id
        FROM transfers t
        JOIN members m
          ON m.id = t.member_id
        WHERE t.id = $1
        FOR UPDATE
        `,
        [transferId]
      );

    const transfer =
      transferResult.rows[0];

    if (!transfer) {
      throw new Error(
        "Transfer not found"
      );
    }

    /* =========================
       DETERMINE STAGE
    ========================= */
    let action;
    let notificationMessage;
    let updateQuery;

    if (
      transfer.status ===
      "requested"
    ) {
      action =
        "source_rejected";

      notificationMessage =
        notes
          ? `Your transfer request was rejected. Reason: ${notes}`
          : "Your transfer request was rejected.";

      updateQuery = `
        UPDATE transfers
        SET
          status = 'rejected',
          source_rejected_by = $1,
          source_rejected_at = NOW(),
          updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
    } else if (
      transfer.status ===
      "pending_destination"
    ) {
      action =
        "destination_rejected";

      notificationMessage =
        notes
          ? `Your transfer request was rejected by the destination church. Reason: ${notes}`
          : "Your transfer request was rejected by the destination church.";

      updateQuery = `
        UPDATE transfers
        SET
          status = 'rejected',
          destination_rejected_by = $1,
          destination_rejected_at = NOW(),
          updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
    } else {
      throw new Error(
        `Cannot reject a ${transfer.status} transfer`
      );
    }

    /* =========================
       UPDATE TRANSFER
    ========================= */
    const updatedTransferResult =
      await client.query(
        updateQuery,
        [
          processedBy,
          transferId,
        ]
      );

    const updatedTransfer =
      updatedTransferResult.rows[0];

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
      VALUES (
        $1,
        $2,
        $3,
        $4
      )
      `,
      [
        transferId,
        action,
        notes,
        processedBy,
      ]
    );

    /* =========================
       MEMBER NOTIFICATION
    ========================= */
    await client.query(
      `
      INSERT INTO notifications (
        user_id,
        church_id,
        type,
        title,
        message
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5
      )
      `,
      [
        transfer.profile_id,
        transfer.source_church_id,
        "transfer_rejected",
        "Transfer Rejected",
        notificationMessage,
      ]
    );

    await client.query("COMMIT");

    return updatedTransfer;
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );
    throw error;
  } finally {
    client.release();
  }
}