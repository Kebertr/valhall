import { getKeycloak } from "./keycloak";

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const keycloak = getKeycloak();

  try {
    await keycloak.updateToken(30);
  } catch {
    await keycloak.login();
    throw new Error("Login required");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${keycloak.token}`);

  return fetch(input, {
    ...init,
    headers,
  });
}