import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

/**
 * Custom permissions for the law firm dashboard
 * 
 * Roles:
 * - super: Full system access, can manage all admins and users
 * - admin: Can manage users, matters, contacts, settings
 * - user: Can view assigned matters, receive notifications
 */

const statement = {
  ...defaultStatements,
  // Custom resources for the law firm dashboard
  matter: ["create", "read", "update", "delete", "assign"],
  contact: ["create", "read", "update", "delete"],
  settings: ["read", "update"],
  notifications: ["read", "manage"],
  sync: ["trigger", "configure"],
  metrics: ["read"],
} as const;

export const ac = createAccessControl(statement);

// Super Admin - Full access to everything including managing other admins
export const superRole = ac.newRole({
  ...adminAc.statements,
  matter: ["create", "read", "update", "delete", "assign"],
  contact: ["create", "read", "update", "delete"],
  settings: ["read", "update"],
  notifications: ["read", "manage"],
  sync: ["trigger", "configure"],
  metrics: ["read"],
});

// Admin - Can manage users (but not super), matters, contacts, settings
export const adminRole = ac.newRole({
  user: ["create", "list", "ban", "set-password"], // Cannot set-role or delete (reserved for super)
  session: ["list", "revoke"],
  matter: ["create", "read", "update", "delete", "assign"],
  contact: ["create", "read", "update", "delete"],
  settings: ["read", "update"],
  notifications: ["read", "manage"],
  sync: ["trigger", "configure"],
  metrics: ["read"],
});

// User - Basic access to view and work on assigned matters
export const userRole = ac.newRole({
  matter: ["read", "update"], // Can only read and update assigned matters
  contact: ["read"],
  settings: ["read"],
  notifications: ["read"],
  metrics: ["read"], // Can view their own metrics
});
