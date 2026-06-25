import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import valhallLogo from "../assets/valhall.jpg";
import { authFetch } from "../auth/authFetch";

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
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-16 text-white">
      {menuOpen && <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setMenuOpen(false)} />}

      <aside className={`fixed top-0 left-0 z-50 h-full w-72 bg-slate-800 shadow-2xl transition-transform duration-300 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="border-b border-slate-700 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 font-bold">R</div>
            <div><p className="font-semibold">Rasmus</p><p className="text-sm text-slate-400">ACTIVE</p></div>
          </div>
        </div>
        <nav className="flex flex-col p-4">
          <button onClick={() => navigate("/")} className="rounded-xl p-3 text-left hover:bg-slate-700">Home</button>
          <button onClick={() => navigate("/add")} className="rounded-xl p-3 text-left hover:bg-slate-700">Add Shot</button>
          <button onClick={() => navigate("/redeem")} className="rounded-xl p-3 text-left hover:bg-slate-700">Redeem Shot</button>
          <button onClick={() => navigate("/leaderboard")} className="rounded-xl p-3 text-left hover:bg-slate-700">Leaderboard</button>
          <button onClick={() => navigate("/notifications")} className="rounded-xl p-3 text-left hover:bg-slate-700">Notifications</button>
          <div className="mt-8 border-t border-slate-700 pt-4">
            <button onClick={() => navigate("/profile")} className="w-full rounded-xl p-3 text-left hover:bg-slate-700">Edit Profile</button>
            <button className="w-full rounded-xl p-3 text-left hover:bg-slate-700">Logout</button>
          </div>
        </nav>
      </aside>

      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="relative flex min-h-[160px] items-start p-4">
          <button onClick={() => setMenuOpen(true)} className="z-10 rounded-lg p-2 text-2xl hover:bg-slate-800" aria-label="Open menu">☰</button>
          <div className="absolute top-4 left-1/2 flex -translate-x-1/2 flex-col items-center">
            <img src={valhallLogo} alt="Valhall Logo" className="h-24 w-auto object-contain" />
            <h1 className="mt-2 text-3xl font-bold tracking-wider text-blue-500">Valhall</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 pt-12">
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
          <section key={status} className="overflow-x-auto rounded-3xl border border-slate-700 bg-slate-800/90 p-4 shadow-2xl">
            <h2 className="mb-3 text-xl font-bold text-blue-400">
              {status === "GUD" ? "Gudar" : status === "AS" ? "Asar" : "Vikingar"}
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
                {members.filter((member) => member.status === status).map((member) => (
                    <tr key={member.memberId} className="border-b border-slate-700 last:border-0 hover:bg-slate-700/40">
                      <td className="p-3 font-bold">{member.memberId}</td>
                      <td className="p-3 text-slate-300">{member.name}</td>
                      <td className="p-3 font-bold">{member.godname}</td>
                      <td className="p-3">
                        {member.role ? (
                          <span className="rounded-full bg-slate-700 px-3 py-1.5 text-sm font-semibold">{member.role}</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="p-3">{member.status}</td>
                      <td className="p-3">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt={member.godname} className="h-11 w-11 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 font-bold">{member.godname.charAt(0)}</div>
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
