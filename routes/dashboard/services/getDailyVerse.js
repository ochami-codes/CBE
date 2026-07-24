// services/dailyVerseService.js

import { pool } from "../../../db.js";

const DEFAULT_VERSE = {
  reference: "Psalm 118:24",
  text: "This is the day the Lord has made; let us rejoice and be glad in it.",
};

export async function getDailyVerse(date = new Date()) {
  const verseDate = date.toISOString().split("T")[0];

  const { rows } = await pool.query(
    `
    SELECT
      reference,
      text
    FROM daily_verses
    WHERE verse_date = $1
    LIMIT 1;
    `,
    [verseDate]
  );

  return rows[0] ?? DEFAULT_VERSE;
}