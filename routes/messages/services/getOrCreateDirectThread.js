
export async function getOrCreateDirectThread({
  client,
  churchId,
  senderId,
  recipientId,
}) {
  const { rows: existing } = await client.query(
    `
    SELECT t.id
    FROM threads t
    JOIN thread_participants tp
      ON tp.thread_id = t.id
    WHERE t.type = 'direct'
      AND t.church_id = $1
      AND tp.user_id IN ($2, $3)
    GROUP BY t.id
    HAVING COUNT(DISTINCT tp.user_id) = 2
    LIMIT 1
    `,
    [churchId, senderId, recipientId]
  );

  if (existing.length) {
    return existing[0].id;
  }

  const { rows } = await client.query(
    `
    INSERT INTO threads (
      church_id,
      type
    )
    VALUES ($1, 'direct')
    RETURNING id
    `,
    [churchId]
  );

  const threadId = rows[0].id;

  await client.query(
    `
    INSERT INTO thread_participants (
      thread_id,
      user_id
    )
    VALUES
      ($1, $2),
      ($1, $3)
    ON CONFLICT (
      thread_id,
      user_id
    )
    DO NOTHING
    `,
    [
      threadId,
      senderId,
      recipientId,
    ]
  );

  return threadId;
}