// config/roles.js

/* --------------------------------
   System Roles
-------------------------------- */

export const SYSTEM_ROLES = {
  super_admin: {
    label: "Super Admin",
  },
};

/* --------------------------------
   Church Roles
-------------------------------- */

export const ROLES = {
  admin: {
    label: "Admin",
  },

  pastor: {
    label: "Pastor",
  },

  treasurer: {
    label: "Treasurer",
  },

  youth_leader: {
    label: "Youth Leader",
  },

  children_leader: {
    label: "Children Leader",
  },

  communication_leader: {
    label: "Communication Leader",
  },

  choir_leader: {
    label: "Choir Leader",
  },

  amo_leader: {
    label: "AMO Leader",
  },

  alo_leader: {
    label: "ALO Leader",
  },

  deaconry_leader: {
    label: "Deaconry Leader",
  },

  clerk: {
    label: "Church Clerk",
  },

  s_school_leader: {
    label: "Sabbath School Leader",
  },
};

/* --------------------------------
   Role Permissions
-------------------------------- */

export const ROLE_PERMISSIONS = {
  admin: [
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

    "manage_members",
    "manage_requests",
    "manage_departments",
    "manage_roles",
    "manage_media",
    "manage_records",
    "manage_dept_announcements",
    "manage_finances",
  ],

  pastor: [
    "access_pastor_dashboard",
    "access_media_dashboard",

    "manage_departments",
    "manage_media",
  ],

  treasurer: [
    "access_treasury_dashboard",
    "manage_finances",
  ],

  youth_leader: [
    "access_youth_dashboard",
    "manage_youth",
    "manage_dept_announcements",
  ],

  children_leader: [
    "access_children_dashboard",
    "manage_children",
  ],

  communication_leader: [
    "access_media_dashboard",
    "manage_media",
  ],

  choir_leader: [
    "access_choir_dashboard",
    "manage_choir",
    "manage_dept_announcements",
  ],

  s_school_leader: [
    "access_s_school_dashboard",
    "manage_s_school",
  ],

  clerk: [
    "access_clerk_dashboard",
    "manage_records",
  ],

  amo_leader: [
    "access_amo_dashboard",
    "manage_amo",
    "manage_dept_announcements",
  ],

  alo_leader: [
    "access_alo_dashboard",
    "manage_alo",
    "manage_dept_announcements",
  ],

  deaconry_leader: [
    "access_deaconry_dashboard",
    "manage_deaconry",
    "manage_dept_announcements",
  ],
};

/* --------------------------------
   Role Lists
-------------------------------- */

export const ALL_ROLES = Object.keys(
  ROLES
);

export const REQUESTABLE_ROLES =
  ALL_ROLES.filter(
    (role) =>
      role !== "admin"
  );

/* --------------------------------
   Normalization
-------------------------------- */

export const normalizeRole = (
  role
) =>
  role
    ?.toLowerCase()
    .trim();

/* --------------------------------
   Role Permissions
-------------------------------- */

export const getRolePermissions = (
  role
) =>
  ROLE_PERMISSIONS[
    normalizeRole(role)
  ] ?? [];

export const getUserPermissions = (
  roles = []
) => [
  ...new Set(
    roles.flatMap(
      (role) =>
        getRolePermissions(role)
    )
  ),
];

/* --------------------------------
   Permission Check
-------------------------------- */

export const hasPermission = (
  roles = [],
  permission
) => {
  if (!permission) {
    return true;
  }

  const normalizedRoles =
    roles.map(normalizeRole);

  // Church admin has full church-level access
  if (
    normalizedRoles.includes(
      "admin"
    )
  ) {
    return true;
  }

  return getUserPermissions(
    normalizedRoles
  ).includes(permission);
};

/* --------------------------------
   Role Helpers
-------------------------------- */

export const getRoleLabel = (
  role
) =>
  ROLES[
    normalizeRole(role)
  ]?.label ??
  role;

export const hasRole = (
  roles = [],
  role
) =>
  roles
    .map(normalizeRole)
    .includes(
      normalizeRole(role)
    );

export const isValidRole = (
  role
) =>
  ALL_ROLES.includes(
    normalizeRole(role)
  );

export const isRequestableRole = (
  role
) =>
  REQUESTABLE_ROLES.includes(
    normalizeRole(role)
  );