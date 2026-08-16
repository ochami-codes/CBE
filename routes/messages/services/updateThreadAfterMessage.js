export async function updateThreadAfterMessage({
  client,
  threadId,
  message,
  senderId,
}) {
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
      threadId,
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
      threadId,
    ]
  );
}