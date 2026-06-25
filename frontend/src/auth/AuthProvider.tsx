import { useEffect, useState, type PropsWithChildren } from "react";
import { initializeKeycloak } from "./keycloak";

export default function AuthProvider({ children }: PropsWithChildren) {
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;

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
