import { pool } from "../../../db.js";

export async function createDailyVerse({
  reference,
  text,
  verseDate,
}) {
  if (!reference) {
    throw new Error("Reference is required.");
  }

  if (!text) {
    throw new Error("Verse text is required.");
  }

  if (!verseDate) {
    throw new Error("Verse date is required.");
  }

  const { rows } = await pool.query(
    `
    INSERT INTO daily_verses (
      reference,
      text,
      verse_date
    )
    VALUES (
      $1,
      $2,
      $3
    )
    RETURNING
      id,
      reference,
      text,
      verse_date;
    `,
    [
      reference.trim(),
      text.trim(),
      verseDate,
    ]
  );

  return rows[0];
}