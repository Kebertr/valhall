import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import valhallLogo from "../assets/valhall.jpg";
import { authFetch } from "../auth/authFetch";
import LogoutButton from "../auth/LogoutButton";
import { hasAnyRole } from "../auth/roles";

type MemberStatus = "VIKING" | "GUD" | "AS";

type Member = {
  memberId: number;
  name: string;
  godname: string;
  role: string | null;
  avatarUrl: string | null;
  status: MemberStatus;
};

const statuses: MemberStatus[] = ["GUD", "AS", "VIKING"];

function Gudar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [godname, setGodname] = useState("");
  const [status, setStatus] = useState<MemberStatus>("VIKING");
  const [role, setRole] = useState("");
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const canCreateMembers = hasAnyRole(["ADMIN", "ORDFORANDE"]);

  useEffect(() => {
    let active = true;

    async function fetchMembers() {
      try {
        setIsLoadingMembers(true);
        setMembersError(null);

        const response = await authFetch("/api/members/gudar");

        if (!response.ok) {
          throw new Error("Failed to fetch members");
        }

        const data = (await response.json()) as Member[];

        if (active) {
          setMembers(data);
        }
      } catch (error) {
        if (active) {
          setMembersError(
            error instanceof Error ? error.message : "Could not fetch members",
          );
        }
      } finally {
        if (active) {
          setIsLoadingMembers(false);
        }
      }
    }

    fetchMembers();

    return () => {
      active = false;
    };
  }, []);

  async function createMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateMessage(null);

    const response = await authFetch("/api/members/add-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        godname: godname.trim(),
        status,
        ...(role.trim() ? { role: role.trim() } : {}),
      }),
    });
    const body = (await response.json().catch(() => null)) as
      Member | { message?: string } | null;

    if (!response.ok) {
      setCreateMessage(
        body && "message" in body && body.message
          ? body.message
          : "Kunde inte lägga till medlemmen.",
      );
      return;
    }

    setMembers((current) => [...current, body as Member]);
    setName("");
    setGodname("");
    setStatus("VIKING");
    setRole("");
    setCreateMessage("Medlemmen har lagts till.");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-16 text-white">
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-slate-800 shadow-2xl transition-transform duration-300 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="border-b border-slate-700 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 font-bold">
              R
            </div>
            <div>
              <p className="font-semibold">Rasmus</p>
              <p className="text-sm text-slate-400">ACTIVE</p>
            </div>
          </div>
        </div>
        <nav className="flex flex-col p-4">
          <button
            onClick={() => navigate("/")}
            className="rounded-xl p-3 text-left hover:bg-slate-700"
          >
            Hem
          </button>
          <button
            onClick={() => navigate("/add")}
            className="rounded-xl p-3 text-left hover:bg-slate-700"
          >
            Ge bong
          </button>
          <button
            onClick={() => navigate("/redeem")}
            className="rounded-xl p-3 text-left hover:bg-slate-700"
          >
            Lös in bong
          </button>
          <button
            onClick={() => navigate("/leaderboard")}
            className="rounded-xl p-3 text-left hover:bg-slate-700"
          >
            Topplista
          </button>
          <button
            onClick={() => navigate("/notifications")}
            className="rounded-xl p-3 text-left hover:bg-slate-700"
          >
            Notiser
          </button>
          {hasAnyRole(["ADMIN", "ORDFORANDE"]) && (
            <button
              onClick={() => navigate("/member-links")}
              className="rounded-xl p-3 text-left hover:bg-slate-700"
            >
              Medlemslänkar
            </button>
          )}
          <div className="mt-8 border-t border-slate-700 pt-4">
            <button
              onClick={() => navigate("/profile")}
              className="w-full rounded-xl p-3 text-left hover:bg-slate-700"
            >
              Redigera profil
            </button>
            <LogoutButton className="w-full rounded-xl p-3 text-left hover:bg-slate-700" />
          </div>
        </nav>
      </aside>

      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="relative flex min-h-[160px] items-start p-4">
          <button
            onClick={() => setMenuOpen(true)}
            className="z-10 rounded-lg p-2 text-2xl hover:bg-slate-800"
            aria-label="Open menu"
          >
            ☰
          </button>
          <div className="absolute top-4 left-1/2 flex -translate-x-1/2 flex-col items-center">
            <img
              src={valhallLogo}
              alt="Valhall Logo"
              className="h-24 w-auto object-contain"
            />
            <h1 className="mt-2 text-3xl font-bold tracking-wider text-blue-500">
              Valhall
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 pt-12">
        {canCreateMembers && (
          <section className="rounded-3xl border border-blue-900/30 bg-slate-800/90 p-6 shadow-2xl">
            <h2 className="mb-5 text-2xl font-bold text-blue-400">
              Lägg till medlem
            </h2>
            <form
              onSubmit={(event) => void createMember(event)}
              className="grid gap-4 md:grid-cols-2"
            >
              <label className="font-semibold">
                Namn
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 w-full rounded-xl bg-slate-700 p-3 font-normal"
                />
              </label>
              <label className="font-semibold">
                Gudnamn
                <input
                  required
                  value={godname}
                  onChange={(event) => setGodname(event.target.value)}
                  className="mt-2 w-full rounded-xl bg-slate-700 p-3 font-normal"
                />
              </label>
              <label className="font-semibold">
                Status
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as MemberStatus)
                  }
                  className="mt-2 w-full rounded-xl bg-slate-700 p-3 font-normal"
                >
                  {statuses.map((memberStatus) => (
                    <option key={memberStatus} value={memberStatus}>
                      {memberStatus}
                    </option>
                  ))}
                </select>
              </label>
              <label className="font-semibold">
                Roll (valfri)
                <input
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  className="mt-2 w-full rounded-xl bg-slate-700 p-3 font-normal"
                />
              </label>
              <button
                type="submit"
                className="rounded-xl bg-blue-600 p-4 font-bold hover:bg-blue-500 md:col-span-2"
              >
                Lägg till medlem
              </button>
            </form>
            {createMessage && (
              <p className="mt-4" role="status">
                {createMessage}
              </p>
            )}
          </section>
        )}

        {isLoadingMembers && (
          <div className="rounded-3xl border border-blue-900/30 bg-slate-800/90 p-4 shadow-2xl">
            Loading members...
          </div>
        )}

        {membersError && (
          <div className="rounded-3xl border border-red-900/30 bg-red-950/70 p-4 text-red-100 shadow-2xl">
            {membersError}
          </div>
        )}

        {statuses.map((status) => (
          <section
            key={status}
            className="overflow-x-auto rounded-3xl border border-slate-700 bg-slate-800/90 p-4 shadow-2xl"
          >
            <h2 className="mb-3 text-xl font-bold text-blue-400">
              {status === "GUD"
                ? "Gudar"
                : status === "AS"
                  ? "Asar"
                  : "Vikingar"}
            </h2>
            <table className="w-full min-w-[750px] text-left">
              <thead className="border-b border-slate-600 text-blue-400">
                <tr>
                  <th className="p-3">Nummer</th>
                  <th className="p-3">Namn</th>
                  <th className="p-3">Godname</th>
                  <th className="p-3">Roll</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Bild</th>
                </tr>
              </thead>
              <tbody>
                {members
                  .filter((member) => member.status === status)
                  .map((member) => (
                    <tr
                      key={member.memberId}
                      className="border-b border-slate-700 last:border-0 hover:bg-slate-700/40"
                    >
                      <td className="p-3 font-bold">{member.memberId}</td>
                      <td className="p-3 text-slate-300">{member.name}</td>
                      <td className="p-3 font-bold">{member.godname}</td>
                      <td className="p-3">
                        {member.role ? (
                          <span className="rounded-full bg-slate-700 px-3 py-1.5 text-sm font-semibold">
                            {member.role}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="p-3">{member.status}</td>
                      <td className="p-3">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.godname}
                            className="h-11 w-11 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 font-bold">
                            {member.godname.charAt(0)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
        ))}
      </main>
    </div>
  );
}

export default Gudar;
