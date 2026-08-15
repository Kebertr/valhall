import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { authFetch } from "../auth/authFetch";
import Navbar from "../components/Navbar";
import { hasAnyRole } from "../auth/roles";

type Member = {
  memberId: number;
  name: string;
  godname: string;
};

type Invitation = {
  url: string;
  expiresAt: string;
};

async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    if (!document.execCommand("copy")) {
      throw new Error("Copy command was rejected");
    }
  } finally {
    textarea.remove();
  }
}

export default function MemberLinks() {
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

    try {
      await copyText(invitation.url);
      setMessage("Länken har kopierats.");
    } catch {
      setMessage("Kunde inte kopiera länken. Markera och kopiera den manuellt.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-24 text-white">
      <Navbar />

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
              <input
                type="text"
                readOnly
                value={invitation.url}
                onFocus={(event) => event.currentTarget.select()}
                aria-label="Inbjudningslänk"
                className="w-full rounded-lg bg-slate-800 p-3 text-sm"
              />
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
