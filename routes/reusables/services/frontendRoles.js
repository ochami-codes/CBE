// services/role.service.js

import {
  ROLES,
  ALL_ROLES,
  REQUESTABLE_ROLES,
  ROLE_PERMISSIONS,
} from "../../../config/roles.js";

export async function getFrontendRoles() {
  return {
    roles: ALL_ROLES.map((name) => ({
      name,
      label: ROLES[name].label,
      permissions: ROLE_PERMISSIONS[name] ?? [],
      requestable: REQUESTABLE_ROLES.includes(name),
    })),

    requestableRoles: REQUESTABLE_ROLES,

    permissions: [
      ...new Set(
        Object.values(ROLE_PERMISSIONS).flat()
      ),
    ],
  };
}