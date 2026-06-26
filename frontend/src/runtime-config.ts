export type ValhallRuntimeConfig = {
  keycloakUrl?: string;
  keycloakRealm?: string;
  keycloakClientId?: string;
};

declare global {
  interface Window {
    __VALHALL_CONFIG__?: ValhallRuntimeConfig;
  }
}

export function getRuntimeConfig() {
  return window.__VALHALL_CONFIG__ ?? {};
}
