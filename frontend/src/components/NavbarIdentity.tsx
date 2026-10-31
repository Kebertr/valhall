import { useEffect, useState } from "react";
import { authFetch } from "../auth/authFetch";

type CurrentMember = {
  name: string;
  avatarUrl: string | null;
  status: string;
};

function NavbarIdentity() {
  const [member, setMember] = useState<CurrentMember | null>(null);

  useEffect(() => {
    let active = true;

    authFetch("/api/members/me")
      .then(async (response) => {
        if (!response.ok) throw new Error("Kunde inte hämta profil");
        return (await response.json()) as CurrentMember;
      })
      .then((currentMember) => {
        if (active) setMember(currentMember);
      })
      .catch(() => {
        // Keep the neutral fallback when the member profile is unavailable.
      });

    return () => {
      active = false;
    };
  }, []);

  const initial = member?.name.trim().charAt(0).toLocaleUpperCase() || "?";

  return (
    <div className="flex items-center gap-3">
      {member?.avatarUrl ? (
        <img
          src={member.avatarUrl}
          alt=""
          className="h-12 w-12 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 font-bold">
          {initial}
        </div>
      )}
      <div>
        <p className="font-semibold">{member?.name ?? "Laddar..."}</p>
        <p className="text-sm text-slate-400">{member?.status ?? ""}</p>
      </div>
    </div>
  );
}

export default NavbarIdentity;