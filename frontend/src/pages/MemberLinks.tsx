import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { authFetch } from "../auth/authFetch";
import LogoutButton from "../auth/LogoutButton";
import { hasAnyRole } from "../auth/roles";
import valhallLogo from "../assets/valhall.jpg";

type Member = {
  memberId: number;
  name: string;
  godname: string;
};

type Invitation = {
  url: string;
  expiresAt: string;
};

export default function MemberLinks() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const canManageLinks = hasAnyRole(["ADMIN", "ORDFORANDE"]);

  useEffect(() => {
    if (!canManageLinks) return;

    void authFetch("/api/members/unlinked")
      .then(async (response) => {
        if (!response.ok) throw new Error("Kunde inte hämta medlemmar.");
        setMembers((await response.json()) as Member[]);
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Ett fel uppstod.");
      });
  }, [canManageLinks]);

  if (!canManageLinks) {
    return <Navigate to="/" replace />;
  }

  async function createInvitation() {
    if (!selectedMemberId) {
      setMessage("Välj en medlem först.");
      return;
    }

    const response = await authFetch(
      `/api/members/${selectedMemberId}/link-invitations`,
      { method: "POST" },
    );
    const body = (await response.json().catch(() => null)) as
      Invitation | { message?: string } | null;

    if (!response.ok) {
      setMessage(
        body && "message" in body && body.message
          ? body.message
          : "Kunde inte skapa länken.",
      );
      return;
    }

    setInvitation(body as Invitation);
    setMessage(null);
  }

  async function copyInvitation() {
    if (!invitation) return;
    await navigator.clipboard.writeText(invitation.url);
    setMessage("Länken har kopierats.");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-slate-800 shadow-2xl transition-transform ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
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
            onClick={() => navigate("/gudar")}
            className="rounded-xl p-3 text-left hover:bg-slate-700"
          >
            Gudar
          </button>
          <button
            onClick={() => navigate("/member-links")}
            className="rounded-xl p-3 text-left hover:bg-slate-700"
          >
            Medlemslänkar
          </button>
          <LogoutButton className="mt-8 border-t border-slate-700 pt-4 text-left" />
        </nav>
      </aside>

      <header className="sticky top-0 border-b border-slate-800 bg-slate-950/90">
        <div className="relative flex min-h-[160px] items-start p-4">
          <button
            onClick={() => setMenuOpen(true)}
            className="z-10 rounded-lg p-2 text-2xl"
            aria-label="Öppna meny"
          >
            ☰
          </button>
          <div className="absolute top-4 left-1/2 flex -translate-x-1/2 flex-col items-center">
            <img src={valhallLogo} alt="Valhall" className="h-24 w-auto" />
            <h1 className="mt-2 text-3xl font-bold text-blue-500">Valhall</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-16">
        <section className="rounded-3xl border border-blue-900/30 bg-slate-800/90 p-6 shadow-2xl">
          <h2 className="mb-6 text-3xl font-bold text-blue-400">
            Medlemslänkar
          </h2>

          <label htmlFor="member" className="mb-2 block font-semibold">
            Välj medlem
          </label>
          <select
            id="member"
            value={selectedMemberId}
            onChange={(event) => setSelectedMemberId(event.target.value)}
            className="w-full rounded-xl bg-slate-700 p-4"
          >
            <option value="">Välj en medlem...</option>
            {members.map((member) => (
              <option key={member.memberId} value={member.memberId}>
                {member.godname} ({member.name})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => void createInvitation()}
            className="mt-5 w-full rounded-xl bg-blue-600 p-4 font-bold hover:bg-blue-500"
          >
            Skapa inbjudningslänk
          </button>

          {invitation && (
            <div className="mt-6 rounded-xl bg-slate-700 p-4">
              <p className="break-all">{invitation.url}</p>
              <p className="mt-2 text-sm text-slate-300">
                Giltig till{" "}
                {new Date(invitation.expiresAt).toLocaleString("sv-SE")}
              </p>
              <button
                type="button"
                onClick={() => void copyInvitation()}
                className="mt-4 rounded-lg bg-slate-600 px-4 py-2 font-semibold"
              >
                Kopiera länk
              </button>
            </div>
          )}

          {message && (
            <p className="mt-4" role="status">
              {message}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
