import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";
import { getRoleLabel } from "../../../config/roles.js";
export async function getMessageUsers({
  churchId,
  profileId,
}) {
  if (!churchId) {
    throw createAppError("Church is required.", 400, ERROR_CODES.CHURCH_NOT_FOUND);
  }

  if (!profileId) {
    throw createAppError("User is required.", 401, ERROR_CODES.AUTHENTICATION_REQUIRED);
  }

  const { rows } = await pool.query(
    `
    SELECT
      m.profile_id,
      p.full_name,
      r.name AS role

    FROM members m

    JOIN profiles p
      ON p.id = m.profile_id

    LEFT JOIN member_roles mr
      ON mr.member_id = m.id

    LEFT JOIN roles r
      ON r.id = mr.role_id

    WHERE
      m.church_id = $1
      AND m.profile_id <> $2
      AND m.status = 'active'

    ORDER BY
      p.full_name
    `,
    [churchId, profileId]
  );

  const groups = new Map();

for (const row of rows) {
  const isLeader = Boolean(row.role);

  const key = isLeader
    ? `role:${row.role}`
    : "members";

  if (!groups.has(key)) {
    groups.set(key, {
      type: isLeader ? "leaders" : "members",
      role: row.role,
      role_label: row.role
        ? getRoleLabel(row.role)
        : null,
      users: [],
    });
  }

  groups.get(key).users.push({
    id: row.profile_id,
    full_name: row.full_name,
  });
}

return [...groups.values()].sort((a, b) => {
  if (
    a.type === "leaders" &&
    b.type === "members"
  ) {
    return -1;
  }

  if (
    a.type === "members" &&
    b.type === "leaders"
  ) {
    return 1;
  }

  return (a.role_label ?? "").localeCompare(
    b.role_label ?? ""
  );
});
}