import { getKeycloak } from "./keycloak";

export function hasAnyRole(requiredRoles: string[]) {
  const roles =
    (
      getKeycloak().tokenParsed as
        { realm_access?: { roles?: string[] } } | undefined
    )?.realm_access?.roles ?? [];

  const normalizedRoles = roles.map((role) => role.toUpperCase());
  return requiredRoles.some((role) => normalizedRoles.includes(role));
}
