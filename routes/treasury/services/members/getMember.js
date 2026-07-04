import { pool } from "../../../../db.js";

export async function getMember({
  churchId,
  memberId,
}) {
  const result = await pool.query(
    `
    SELECT
      m.id,
      p.full_name,
      p.phone,
      p.email

    FROM members m

    LEFT JOIN profiles p
      ON p.id = m.profile_id

    WHERE
      m.id = $1
      AND m.church_id = $2

    LIMIT 1
    `,
    [
      memberId,
      churchId,
    ]
  );

  return result.rows[0];
}