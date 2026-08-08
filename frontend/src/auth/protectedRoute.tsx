import type { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";
import { getKeycloak } from "../auth/keycloak";

interface Props {
  requireAdmin?: boolean;
  requiredRoles?: string[];
}

interface RealmAccessToken {
  realm_access?: {
    roles?: string[];
  };
}

export function ProtectedRoute({
  children,
  requireAdmin,
  requiredRoles,
}: PropsWithChildren<Props>) {
  const keycloak = getKeycloak();

  // Not logged in
  if (!keycloak?.authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin || requiredRoles?.length) {
    const roles =
      (keycloak.tokenParsed as RealmAccessToken | undefined)?.realm_access
        ?.roles ?? [];
    const normalizedRoles = roles.map((role) => role.toUpperCase());

    const allowed = requireAdmin
      ? normalizedRoles.includes("ADMIN")
      : requiredRoles!.some((role) =>
          normalizedRoles.includes(role.toUpperCase()),
        );

    if (!allowed) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
