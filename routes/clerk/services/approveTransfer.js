import { pool } from "../../../db.js";

export async function approveTransfer({
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

    if (
      transfer.status !==
      "requested"
    ) {
      throw new Error(
        `Cannot approve a ${transfer.status} transfer`
      );
    }

    /* =========================
       INTERNAL VS EXTERNAL
    ========================= */
    const isInternal =
      transfer.destination_type ===
      "internal";

    const nextStatus =
      isInternal
        ? "pending_destination"
        : "completed";

    /* =========================
       UPDATE TRANSFER
    ========================= */
    const updatedTransferResult =
      await client.query(
        `
        UPDATE transfers
        SET
          status = $1,
          source_approved_by = $2,
          source_approved_at = NOW(),
          updated_at = NOW()
        WHERE id = $3
        RETURNING *
        `,
        [
          nextStatus,
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
        'source_approved',
        $2,
        $3
      )
      `,
      [
        transferId,
        notes,
        processedBy,
      ]
    );

    /* =========================
       INTERNAL TRANSFER
       NOTIFY DESTINATION CLERK
    ========================= */
    if (isInternal) {
      const clerksResult = await client.query(
  `
  SELECT DISTINCT m.profile_id
  FROM member_roles mr
  JOIN members m
    ON m.id = mr.member_id
  JOIN roles r
    ON r.id = mr.role_id
  WHERE m.church_id = $1
    AND r.name = 'clerk'
    AND m.status = 'active'
  `,
  [transfer.destination_church_id]
);

for (const clerk of clerksResult.rows) {
  await client.query(
    `
    INSERT INTO notifications (
      user_id,
      church_id,
      type,
      title,
      message
    )
    VALUES ($1, $2, $3, $4, $5)
    `,
    [
      clerk.profile_id,
      transfer.destination_church_id,
      "transfer_request",
      "New Transfer Request",
      "A transfer request is awaiting your review."
    ]
  );
}
    }
    /* =========================
       EXTERNAL TRANSFER
       COMPLETE IMMEDIATELY
    ========================= */
    if (!isInternal) {
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
          "transfer_completed",
          "Transfer Completed",
          `Your transfer to ${transfer.external_church_name} has been approved.`,
        ]
      );

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
          'completed',
          $2,
          $3
        )
        `,
        [
          transferId,
          "External transfer completed",
          processedBy,
        ]
      );
    }

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