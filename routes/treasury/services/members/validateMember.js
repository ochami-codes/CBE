import { pool } from "../../../../db.js";

export async function validateMember({
  churchId,
  memberId,
}) {

  const result =
    await pool.query(
      `
      SELECT
        id
      FROM members
      WHERE
        id = $1
        AND church_id = $2
      LIMIT 1
      `,
      [
        memberId,
        churchId,
      ]
    );

  if (result.rowCount === 0) {
    throw new Error(
      "Member not found."
    );
  }
}