import Keycloak from "keycloak-js";
import { keycloakConfig } from "./keycloak-config";

let keycloakInstance: Keycloak | null = null;
let initialization: Promise<boolean> | null = null;

export const getKeycloak = () => {
  if (!keycloakInstance) {
    keycloakInstance = new Keycloak(keycloakConfig);
  }
  return keycloakInstance;
};

export const initializeKeycloak = () => {
  if (!initialization) {
    initialization = getKeycloak().init({
      onLoad: "login-required",
      pkceMethod: "S256",
    });
  }

  return initialization;
};
