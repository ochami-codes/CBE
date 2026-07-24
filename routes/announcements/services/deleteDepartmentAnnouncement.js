export async function deleteDepartmentAnnouncement({
  churchId,
  departmentId,
  announcementId,
}) {
  const { rowCount } = await pool.query(
    `
    DELETE FROM announcements
    WHERE
      id = $1
      AND church_id = $2
      AND department_id = $3
    `,
    [
      announcementId,
      churchId,
      departmentId,
    ]
  );

  if (rowCount === 0) {
    throw new Error(
      "Department announcement not found."
    );
  }
}