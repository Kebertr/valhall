import { getRuntimeConfig } from "../runtime-config";

const runtimeConfig = getRuntimeConfig();

export const keycloakConfig = {
  url: runtimeConfig.keycloakUrl ?? import.meta.env.VITE_KEYCLOAK_URL,
  realm: runtimeConfig.keycloakRealm ?? import.meta.env.VITE_KEYCLOAK_REALM,
  clientId:
    runtimeConfig.keycloakClientId ?? import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
};
