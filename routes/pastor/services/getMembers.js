import { pool } from "../../../db.js";

export async function getMembers({
  churchId,
}) {
  const [
    summaryResult,
    membersResult,
  ] = await Promise.all([
    pool.query(
      `
      SELECT
        COUNT(*)::int
          AS total_members,

        COUNT(*) FILTER (
          WHERE LOWER(p.gender) = 'male'
        )::int
          AS total_male,

        COUNT(*) FILTER (
          WHERE LOWER(p.gender) = 'female'
        )::int
          AS total_female,

        (
          SELECT COUNT(*)::int
          FROM children
          WHERE church_id = $1
        ) AS total_children

      FROM members m

      JOIN profiles p
        ON p.id = m.profile_id

      WHERE m.church_id = $1
      `,
      [churchId]
    ),

    pool.query(
      `
      SELECT
        m.id,
        p.full_name,
        p.phone,
        p.gender

      FROM members m

      JOIN profiles p
        ON p.id = m.profile_id

      WHERE m.church_id = $1

      ORDER BY
        p.full_name
      `,
      [churchId]
    ),
  ]);

  const summary =
    summaryResult.rows[0];

  return {
    summary: {
      totalMembers: Number(
        summary.total_members
      ),

      totalChildren: Number(
        summary.total_children
      ),

      totalMale: Number(
        summary.total_male
      ),

      totalFemale: Number(
        summary.total_female
      ),
    },

    list: membersResult.rows,
  };
}