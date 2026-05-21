export type SelfRoleCategory = "platforms" | "interests" | "notifications";

export type SelfAssignableRole = {
  id: string;
  label: string;
  roleName: string;
  category: SelfRoleCategory;
};

export type RoleToggleResult = "added" | "removed";
