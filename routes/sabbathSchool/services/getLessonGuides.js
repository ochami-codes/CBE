import { pool } from "../../../db.js";

export async function getLessonGuides({
  churchId,
}) {
  const now = new Date();

  const year = now.getFullYear();

  const quarter =
    Math.floor(now.getMonth() / 3) + 1;

  const [
    subscriptionsResult,
    summaryResult,
  ] = await Promise.all([
    pool.query(
      `
      SELECT
        lg.id,
        lg.lesson_type,
        lg.year,
        lg.quarter,
        lg.status,
        lg.remarks,
        lg.created_at,

        m.id AS member_id,

        COALESCE(
          p.full_name,
          lg.full_name
        ) AS subscriber_name,

        COALESCE(
          p.phone,
          lg.phone
        ) AS phone,

        p.gender

      FROM sabbath_school_lesson_guides lg

      LEFT JOIN members m
        ON m.id = lg.member_id

      LEFT JOIN profiles p
        ON p.id = m.profile_id

      WHERE lg.church_id = $1

      ORDER BY
        lg.year DESC,
        lg.quarter DESC,
        subscriber_name
      `,
      [churchId]
    ),

    pool.query(
      `
      SELECT
        COUNT(*) AS total_subscribers,

        COUNT(*) FILTER (
          WHERE lesson_type = 'adult'
        ) AS adult_guides,

        COUNT(*) FILTER (
          WHERE lesson_type = 'youth'
        ) AS youth_guides,

        COUNT(*) FILTER (
          WHERE lesson_type = 'children'
        ) AS children_guides

      FROM sabbath_school_lesson_guides

      WHERE
        church_id = $1
        AND year = $2
        AND quarter = $3
      `,
      [
        churchId,
        year,
        quarter,
      ]
    ),
  ]);

  const summary =
    summaryResult.rows[0];

  return {
    subscriptions:
      subscriptionsResult.rows.map(
        (row) => ({
          id: row.id,
          memberId: row.member_id,
          subscriberName:
            row.subscriber_name,
          phone: row.phone,
          gender: row.gender,
          lessonType:
            row.lesson_type,
          year: row.year,
          quarter: row.quarter,
          status: row.status,
          remarks: row.remarks,
          createdAt:
            row.created_at,
        })
      ),

    summary: {
      totalSubscribers: Number(
        summary.total_subscribers
      ),

      adultGuides: Number(
        summary.adult_guides
      ),

      youthGuides: Number(
        summary.youth_guides
      ),

      childrenGuides: Number(
        summary.children_guides
      ),

      currentQuarter: `Q${quarter} ${year}`,
    },
  };
}