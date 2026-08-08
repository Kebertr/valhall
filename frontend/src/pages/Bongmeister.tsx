import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import valhallLogo from "../assets/valhall.jpg";
import { authFetch } from "../auth/authFetch";
import LogoutButton from "../auth/LogoutButton";
import { hasAnyRole } from "../auth/roles";
import NavbarIdentity from "../components/NavbarIdentity";

type Member = {
  id: string;
  name: string;
  godname: string;
  amount: number;
};

function Bongmeister() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [amount, setAmount] = useState(0);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    async function fetchMembers() {
      try {
        const response = await authFetch("/api/bongmeister/shot-targets");

        if (!response.ok) {
          throw new Error("Kunde inte hämta medlemmar");
        }

        const data = (await response.json()) as Member[];
        if (active) setMembers(data);
      } catch (error) {
        if (active) {
          setMembersError(
            error instanceof Error
              ? error.message
              : "Kunde inte hämta medlemmar",
          );
        }
      }
    }

    void fetchMembers();
    return () => {
      active = false;
    };
  }, []);

  const selectedMember = members.find(
    (member) => member.id === selectedMemberId,
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!selectedMemberId || !Number.isInteger(amount) || amount < 0) {
      setMembersError("Välj en medlem");
      return;
    }

    try {
      setIsSubmitting(true);
      setMembersError(null);
      setSubmitMessage(null);

      const response = await authFetch(
        `/api/bongmeister/change-amount/${selectedMemberId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ amount }),
        },
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;

        throw new Error(body?.message ?? "Kunde inte uppdatera medlem");
      }

      setMembers((prevMembers) =>
        prevMembers.map((member) =>
          member.id === selectedMemberId ? { ...member, amount } : member,
        ),
      );
      setSubmitMessage("Antalet bongar har uppdaterats.");
    } catch (error) {
      setMembersError(
        error instanceof Error
          ? error.message
          : "Kunde inte uppdatera medlem",
      );
    } finally {
      setIsSubmitting(false);
    }
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
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-slate-800 shadow-2xl transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-slate-700 p-6">
          <NavbarIdentity />
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
            Bli av med bong
          </button>
          <button
            onClick={() => navigate("/leaderboard")}
            className="rounded-xl p-3 text-left hover:bg-slate-700"
          >
            Topplista
          </button>
          <button
            onClick={() => navigate("/gudar")}
            className="rounded-xl p-3 text-left hover:bg-slate-700"
          >
            Gudar
          </button>
          {hasAnyRole(["ADMIN", "ORDFORANDE"]) && (
            <button
              onClick={() => navigate("/member-links")}
              className="rounded-xl p-3 text-left hover:bg-slate-700"
            >
              Medlemslänkar
            </button>
          )}
          <button
            onClick={() => navigate("/notifications")}
            className="rounded-xl p-3 text-left hover:bg-slate-700"
          >
            Notiser
          </button>
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
            type="button"
            onClick={() => setMenuOpen(true)}
            className="z-10 rounded-lg p-2 text-2xl hover:bg-slate-800"
            aria-label="Open menu"
          >
            ☰
          </button>
          <div className="absolute top-4 left-1/2 flex -translate-x-1/2 flex-col items-center">
            <img src={valhallLogo} alt="Valhall Logo" className="h-24 w-auto object-contain" />
            <h1 className="mt-2 text-3xl font-bold tracking-wider text-blue-500">
              Valhall
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-16">
  <div className="grid gap-6 md:grid-cols-2">
    <section className="rounded-3xl border border-blue-900/30 bg-slate-800/90 p-6 shadow-2xl">
          <h2 className="mb-6 text-2xl font-bold text-blue-400">
            Hantera bongar
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block font-semibold">
              Medlem

              <div className="relative mt-2">
                <select
                  value={selectedMemberId}
                  onChange={(event) => {
                    const id = event.target.value;
                    setSelectedMemberId(id);

                    const member = members.find((member) => member.id === id);
                    setAmount(member?.amount ?? 0);
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-600 bg-slate-700 p-3 pr-28 font-normal"
                >
                  <option value="">Välj medlem</option>

                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                      {member.godname ? ` – ${member.godname}` : ""}
                    </option>
                  ))}
                </select>

                {selectedMember && (
                  <span className="pointer-events-none absolute top-1/2 right-10 -translate-y-1/2 text-slate-300">
                    {selectedMember.amount} bongar
                  </span>
                )}
              </div>
            </label>

            <label className="block font-semibold">
              Antal bongar
              <input
                type="number"
                min={0}
                step={1}
                value={amount}
                disabled={isSubmitting}
                onChange={(event) => {
                  setAmount(Number(event.target.value));
                  setSubmitMessage(null);
                }}
                className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-700 p-3 font-normal disabled:opacity-60"
              />
            </label>

            {membersError && (
              <p role="alert" className="text-red-300">
                {membersError}
              </p>
            )}

            {submitMessage && (
              <p role="status" className="text-green-300">
                {submitMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={
                !selectedMemberId ||
                !Number.isInteger(amount) ||
                amount < 0 ||
                isSubmitting
              }
              className="w-full rounded-xl bg-blue-700 px-4 py-3 font-bold disabled:opacity-50"
            >
              {isSubmitting ? "Sparar..." : "Spara"}
            </button>
          </form>
        </section>

    <section className="rounded-3xl border border-blue-900/30 bg-slate-800/90 p-6 shadow-2xl">
      <h2 className="mb-6 text-2xl font-bold text-blue-400">
        Nuvarande bongar
      </h2>

      <ul className="divide-y divide-slate-700">
        {members.map((member) => (
          <li
            key={member.id}
            className="flex items-center justify-between py-3"
          >
            <div>
              <p className="font-semibold">{member.godname}</p>
              <p className="text-sm text-slate-400">{member.name}</p>
            </div>

            <span className="rounded-lg bg-slate-700 px-3 py-1 font-bold text-blue-300">
              {member.amount}
            </span>
          </li>
        ))}
      </ul>
    </section>
  </div>
</main>
    </div>
  );
}

export default Bongmeister;
