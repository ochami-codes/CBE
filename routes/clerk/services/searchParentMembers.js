import { pool } from "../../../db.js";

export async function searchParentMembers({
  churchId,
  query,
}) {
  const searchTerm = query?.trim();

  if (!searchTerm || searchTerm.length < 2) {
    return [];
  }

  const client = await pool.connect();

  try {
    const result = await client.query(
      `
      SELECT
        m.id,
        p.full_name,
        p.phone
      FROM members m
      INNER JOIN profiles p
        ON p.id = m.profile_id
      WHERE m.church_id = $1
        AND m.status = 'active'
        AND (
          p.full_name ILIKE $2
          OR p.phone ILIKE $2
        )
      ORDER BY
        CASE
          WHEN p.full_name ILIKE $2 THEN 0
          WHEN p.phone ILIKE $2 THEN 1
          ELSE 2
        END,
        p.full_name ASC
      LIMIT 10
      `,
      [churchId, `%${searchTerm}%`]
    );

    return result.rows;
  } finally {
    client.release();
  }
}