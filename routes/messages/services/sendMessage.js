import { pool } from "../../../db.js";
import { validateSendMessageInput } from "../../../utils/validators/messages/messageValidator.js";
import { verifyThreadAccess } from "./verifyThreadAccess.js";
import { insertMessage } from "./insertMessage.js";
import { updateThreadAfterMessage } from "./updateThreadAfterMessage.js";
import { getOrCreateDirectThread } from "./getOrCreateDirectThread.js";

/**
 * Reply inside an existing thread.
 */
export async function replyToThread({
  senderId,
  churchId,
  content,
  threadId,
}) {
  validateSendMessageInput({
    churchId,
    content,
    threadId,
  });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await verifyThreadAccess({
      client,
      threadId,
      userId: senderId,
      churchId,
    });

    const message = await insertMessage({
      client,
      threadId,
      senderId,
      content,
    });

    await updateThreadAfterMessage({
      client,
      threadId,
      message,
      senderId,
    });

    await client.query("COMMIT");

    return {
      message: {
        id: message.id,
        content: message.content,
        sender_id: message.sender_id,
        created_at: message.created_at,
      },
      messageId: message.id,
      threadId,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Start a new direct conversation.
 */
export async function sendNewMessage({
  senderId,
  churchId,
  content,
  recipientProfileId,
}) {
  validateSendMessageInput({
    churchId,
    content,
    recipientProfileId,
  });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const threadId = await getOrCreateDirectThread({
      client,
      churchId,
      senderId,
      recipientId: recipientProfileId,
    });

    const message = await insertMessage({
      client,
      threadId,
      senderId,
      content,
    });

    await updateThreadAfterMessage({
      client,
      threadId,
      message,
      senderId,
    });

    await client.query("COMMIT");

    return {
      message: {
        id: message.id,
        content: message.content,
        sender_id: message.sender_id,
        created_at: message.created_at,
      },
      messageId: message.id,
      threadId,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}