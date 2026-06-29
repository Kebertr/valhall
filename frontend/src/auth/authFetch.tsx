import { getKeycloak } from "./keycloak";

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const keycloak = getKeycloak();

  try {
    await keycloak.updateToken(30);
    console.log("tjo")
    console.log("Keycloak token payload:", keycloak.tokenParsed);
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