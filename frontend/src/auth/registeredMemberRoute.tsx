import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { authFetch } from "./authFetch";

type MemberState = "checking" | "registered" | "unregistered" | "error";

export function RegisteredMemberRoute() {
  const [state, setState] = useState<MemberState>("checking");

  useEffect(() => {
    let active = true;

    authFetch("/api/members/me")
      .then((response) => {
        if (!active) return;

        if (response.ok) {
          setState("registered");
        } else if (response.status === 404) {
          setState("unregistered");
        } else {
          setState("error");
        }
      })
      .catch(() => {
        if (active) setState("error");
      });

    return () => {
      active = false;
    };
  }, []);

  if (state === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Kontrollerar medlemskonto...
      </main>
    );
  }

  if (state === "unregistered") {
    return <Navigate to="/" replace />;
  }

  if (state === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center text-red-300">
        Kunde inte kontrollera medlemskontot. Försök igen senare.
      </main>
    );
  }

  return <Outlet />;
}
