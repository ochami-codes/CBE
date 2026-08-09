import { pool } from "../../../db.js";

export async function fetchClerkOverview(churchId) {
  const result = await pool.query(
    `
    SELECT

      /* -------------------------
         MEMBERS STATS
      -------------------------- */
      COUNT(*) FILTER (WHERE church_id = $1) AS total_members,

      COUNT(*) FILTER (
        WHERE church_id = $1
        AND status = 'active'
      ) AS active_members,

      COUNT(*) FILTER (
        WHERE church_id = $1
        AND status IN ('inactive', 'removed', 'suspended')
      ) AS missing_members,

      /* -------------------------
         TRANSFER STATS
      -------------------------- */
      (
        SELECT COUNT(*)
        FROM transfers t
        WHERE t.source_church_id = $1
        AND t.status = 'requested'
      ) AS pending_transfers

    FROM members
    `,
    [churchId]
  );

  return result.rows[0];
}