import { useEffect, useState, type PropsWithChildren } from "react";
import { getKeycloak, initializeKeycloak } from "./keycloak";
import { captureMemberLinkToken } from "./memberLinkToken";

export default function AuthProvider({ children }: PropsWithChildren) {
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;

    captureMemberLinkToken();

    initializeKeycloak()
      .then((isAuthenticated) => {
        const token = getKeycloak().tokenParsed;

  if (token?.iat && token?.exp) {
    console.log("Access token lifespan:", {
      seconds: token.exp - token.iat,
      minutes: (token.exp - token.iat) / 60,
      issuedAt: new Date(token.iat * 1000),
      expiresAt: new Date(token.exp * 1000),
    });
  }
        if (active) {
          setAuthenticated(isAuthenticated);
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return <p>Unable to connect to the authentication service.</p>;
  }

  if (!authenticated) {
    return null;
  }

  return <>{children}</>;
}
