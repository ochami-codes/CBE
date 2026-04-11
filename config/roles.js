// config/roles.js

// ------------------------------------
// NORMALIZE ROLE
// ------------------------------------
export const normalizeRole = (role) => {
  return role?.toLowerCase().trim();
};

// ------------------------------------
// ROLE PERMISSIONS
// ------------------------------------
export const ROLE_PERMISSIONS = {
  guest: [],

  admin: [
    /* UI access */
    "access_admin_dashboard",
    "access_pastor_dashboard",
    "access_youth_dashboard",
    "access_children_dashboard",
    "access_treasury_dashboard",
    "access_deaconry_dashboard",
    "access_choir_dashboard",
    "access_amo_dashboard",
    "access_alo_dashboard",
    "access_clerk_dashboard",
    "access_s_school_dashboard",
    "access_media_dashboard",

    /* SYSTEM ACTIONS (important) */
    "manage_users",
    "manage_members",
    "delete_members",
    "update_members",
    "approve_requests",
    "manage_events",
    "manage_departments",
    "view_reports",
    "manage_roles",
    "access_role_requests",
  ],

  pastor: [
    "access_pastor_dashboard",
    "access_media_dashboard",

    /* actions */
    "manage_members",
    "approve_requests",
    "manage_events",
  ],

  treasurer: [
    "access_treasury_dashboard",

    /* actions */
    "view_reports",
    "manage_finances",
  ],

  youth_leader: [
    "access_youth_dashboard",

    /* actions */
    "manage_youth",
    "manage_members",
  ],

  children_leader: [
    "access_children_dashboard",

    /* actions */
    "manage_children",
  ],

  communication_leader: [
    "access_media_dashboard",

    /* actions */
    "manage_media",
  ],

  choir_leader: [
    "access_choir_dashboard",

    /* actions */
    "manage_choir",
    "manage_members",
  ],

  s_school_leader: [
    "access_s_school_dashboard",

    /* actions */
    "manage_s_school",
  ],

  clerk: [
    "access_clerk_dashboard",

    /* actions */
    "manage_records",
  ],

  amo_leader: [
    "access_amo_dashboard",

    /* actions */
    "manage_amo",
    "manage_members",
  ],

  alo_leader: [
    "access_alo_dashboard",

    /* actions */
    "manage_alo",
    "manage_members"
  ],

  deaconry_leader: [
    "access_deaconry_dashboard",

    /* actions */
    "manage_deaconry",
    "manage_members",
  ],

  member: [
    "access_dashboard",
    "view_content",
  ],
};
// ------------------------------------
// ROLE LABELS
// ------------------------------------
export const ROLES = {
  guest: { label: "Guest" },

  admin: { label: "Admin" },
  pastor: { label: "Pastor" },
  treasurer: { label: "Treasurer" },
  youth_leader: { label: "Youth Leader" },
  children_leader: { label: "Children Leader" },
  communication_leader: { label: "Communication Leader" },
  choir_leader: { label: "Choir Leader" },
  amo_leader: { label: "AMO Leader" },
  alo_leader: { label: "ALO Leader" },
  deaconry_leader: { label: "Deaconry Leader" },
  clerk: { label: "Church Clerk" },
  s_school_leader: { label: "Sabbath School Leader" },
  member: { label: "Member" },
};

// ------------------------------------
// DERIVED CONSTANTS
// ------------------------------------

// All valid roles
export const ALL_ROLES = Object.keys(ROLES);

// Roles users are allowed to request
export const REQUESTABLE_ROLES = ALL_ROLES.filter(
  (role) => !["guest", "admin"].includes(role)
);

// All permissions (deduplicated)
export const ALL_PERMISSIONS = [
  ...new Set(Object.values(ROLE_PERMISSIONS).flat()),
];

// ------------------------------------
// VALIDATION HELPERS
// ------------------------------------

// Check if role is valid
export const isValidRole = (role) => {
  const normalized = normalizeRole(role);
  return ALL_ROLES.includes(normalized);
};

// ------------------------------------
// PERMISSION HELPERS
// ------------------------------------

// Get permissions for a single role
export const getRolePermissions = (role) => {
  const normalized = normalizeRole(role);
  return ROLE_PERMISSIONS[normalized] || [];
};

// Get permissions for multiple roles
export const getUserPermissions = (roles = []) => {
  if (!roles.length) roles = ["guest"];

  const normalizedRoles = roles.map(normalizeRole);

  const allPermissions = normalizedRoles.flatMap((role) =>
    getRolePermissions(role)
  );

  return [...new Set(allPermissions)];
};

// Check permission (with admin override)
export const hasPermission = (roles = [], permission) => {
  if (!permission) return true;

  const normalizedRoles = roles.map(normalizeRole);

  // ✅ Admin override
  if (normalizedRoles.includes("admin")) return true;

  const userPermissions = getUserPermissions(normalizedRoles);
  return userPermissions.includes(permission);
};

// ------------------------------------
// ROLE HELPERS
// ------------------------------------

// Get role label
export const getRoleLabel = (role) => {
  const normalized = normalizeRole(role);
  return ROLES[normalized]?.label || role;
};

// Check if user has a specific role
export const hasRole = (roles = [], role) => {
  const normalizedRoles = roles.map(normalizeRole);
  return normalizedRoles.includes(normalizeRole(role));
};

// ------------------------------------
// OPTIONAL: ROLE HIERARCHY
// ------------------------------------
export const ROLE_HIERARCHY = [
  "guest",
  "member",
  "youth_leader",
  "children_leader",
  "pastor",
  "admin",
];

export const hasHigherRole = (userRoles = [], requiredRole) => {
  const normalizedRoles = userRoles.map(normalizeRole);
  const requiredIndex = ROLE_HIERARCHY.indexOf(normalizeRole(requiredRole));

  return normalizedRoles.some(
    (role) => ROLE_HIERARCHY.indexOf(role) >= requiredIndex
  );
};
