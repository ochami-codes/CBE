import { pool } from "../../../db.js";
import { ROLES } from "../../../config/roles.js";

export async function getFrontendRoles() {
  const { rows } = await pool.query(`
    SELECT
      id,
      name
    FROM roles
    WHERE LOWER(name) <> 'admin'
    ORDER BY name ASC;
  `);

  return {
    roles: rows.map((role) => ({
      id: role.id,
      name: role.name,
      label:
        ROLES[role.name]?.label ??
        role.name,
    })),
  };
}