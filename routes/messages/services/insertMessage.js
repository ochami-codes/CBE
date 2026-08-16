export async function insertMessage({
  client,
  threadId,
  senderId,
  content,
}) {
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
      thread_id,
      sender_id,
      content,
      created_at
    `,
    [
      threadId,
      senderId,
      content.trim(),
    ]
  );

  return rows[0];
}