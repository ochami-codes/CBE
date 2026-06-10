import { pool } from "../../../db.js"
export async function getSourceTransfersService(churchId) {
  const result = await pool.query(
    `
    SELECT
      t.id,
      t.member_id,
      t.status,
      t.reason,
      t.created_at,
      t.transfer_type,

      -- member info
      p.full_name AS member_name,
      p.phone,

      -- churches
      sc.id AS source_church_id,
      sc.name AS source_church_name,
      sc.church_code AS source_church_code,

      dc.id AS destination_church_id,
      dc.name AS destination_church_name,
      dc.church_code AS destination_church_code

    FROM transfers t

    LEFT JOIN members m
      ON m.id = t.member_id

    LEFT JOIN profiles p
      ON p.id = m.profile_id

    LEFT JOIN churches sc
      ON sc.id = t.source_church_id

    LEFT JOIN churches dc
      ON dc.id = t.destination_church_id

    WHERE t.source_church_id = $1
      AND t.status = 'requested'

    ORDER BY t.created_at DESC
    `,
    [churchId]
  );

  return result.rows;
}