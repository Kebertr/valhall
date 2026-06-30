export interface AuthenticatedUser {
  keycloakId: string;
  email?: string;
  emailVerified: boolean;
  roles: string[];
}
