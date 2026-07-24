export async function deleteChurchAnnouncement({
  churchId,
  announcementId,
}) {
  const { rowCount } = await pool.query(
    `
    DELETE FROM announcements
    WHERE
      id = $1
      AND church_id = $2
      AND department_id IS NULL
    `,
    [
      announcementId,
      churchId,
    ]
  );

  if (rowCount === 0) {
    throw new Error(
      "Church announcement not found."
    );
  }
}