import { pool } from "../../../db.js";

export async function deleteAnnouncement({
  churchId,
  announcementId,
}) {
  const { rowCount } = await pool.query(
    `
    DELETE FROM announcements
    WHERE
      id = $1
      AND church_id = $2
    `,
    [
      announcementId,
      churchId,
    ]
  );

  if (rowCount === 0) {
    throw new Error(
      "Announcement not found."
    );
  }
}