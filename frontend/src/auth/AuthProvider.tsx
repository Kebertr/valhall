import { useEffect, useState, type PropsWithChildren } from "react";
import { initializeKeycloak } from "./keycloak";
import { captureMemberLinkToken } from "./memberLinkToken";

export default function AuthProvider({ children }: PropsWithChildren) {
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;

    captureMemberLinkToken();

    initializeKeycloak()
      .then((isAuthenticated) => {
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
