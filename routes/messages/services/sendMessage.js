import { pool } from "../../../db.js";
import { validateSendMessageInput } from "../../../utils/validators/messages/messageValidator.js";

export async function sendMessage({
  senderId,
  churchId,
  content,
  recipientProfileId,
  threadId,
}) {
  validateSendMessageInput({
    churchId,
    content,
    recipientProfileId,
    threadId,
  });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let finalThreadId = threadId;

    if (!finalThreadId) {
      finalThreadId =
        await getOrCreateDirectThread({
          client,
          churchId,
          senderId,
          recipientId: recipientProfileId,
        });
    }

    const { rows } = await client.query(
      `
      INSERT INTO messages (
        thread_id,
        sender_id,
        content
      )
      VALUES ($1, $2, $3)
      RETURNING
        id,
        created_at
      `,
      [
        finalThreadId,
        senderId,
        content.trim(),
      ]
    );

    const message = rows[0];

    await client.query(
      `
      INSERT INTO thread_reads (
        thread_id,
        user_id,
        last_read_at
      )
      VALUES (
        $1,
        $2,
        NOW()
      )
      ON CONFLICT (
        thread_id,
        user_id
      )
      DO UPDATE
      SET last_read_at = NOW()
      `,
      [
        finalThreadId,
        senderId,
      ]
    );

    await client.query(
      `
      UPDATE threads
      SET
        last_message_id = $1,
        last_message_at = $2
      WHERE id = $3
      `,
      [
        message.id,
        message.created_at,
        finalThreadId,
      ]
    );

    await client.query("COMMIT");

    return {
      messageId: message.id,
      threadId: finalThreadId,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}