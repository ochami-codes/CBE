import { pool } from "../../../db.js";

export async function getUpcomingBirthdays(
  {churchId,
  daysAhead = 7}
) {
  if (!churchId) {
    throw new Error("Church is required.");
  }

  const { rows } = await pool.query(
    `
    SELECT
      p.id,
      p.full_name,
      p.date_of_birth
    FROM members m
    JOIN profiles p
      ON p.id = m.profile_id
    WHERE m.church_id = $1
      AND m.status = 'active'
      AND p.date_of_birth IS NOT NULL;
    `,
    [churchId]
  );

  const today = new Date();
  const currentYear = today.getUTCFullYear();

  return rows
    .map((member) => {
      const dob = new Date(member.date_of_birth);

      let nextBirthday = new Date(
        Date.UTC(
          currentYear,
          dob.getUTCMonth(),
          dob.getUTCDate()
        )
      );

      if (nextBirthday < today) {
        nextBirthday.setUTCFullYear(currentYear + 1);
      }

      const daysLeft = Math.ceil(
        (nextBirthday - today) /
          (1000 * 60 * 60 * 24)
      );

      if (daysLeft > daysAhead) {
        return null;
      }

      return {
        ...member,
        days_left: daysLeft,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.days_left - b.days_left);
}