import { pool } from "../../../db.js";

export async function deleteMember({
  churchId,
  memberId,
  departmentId,
}) {
  const { rowCount } = await pool.query(
    `
    DELETE FROM member_departments md
    USING members m

    WHERE
      md.member_id = m.id
      AND md.member_id = $1
      AND md.department_id = $2
      AND m.church_id = $3
    `,
    [
      memberId,
      departmentId,
      churchId,
    ]
  );

  if (!rowCount) {
    throw new Error(
      "Member is not assigned to this department."
    );
  }

  return {
    message: "Member removed from department.",
  };
}