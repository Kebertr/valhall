import { useNavigate } from "react-router-dom";
import valhallLogo from "../assets/valhall.jpg";
import LogoutButton from "../auth/LogoutButton";
import { hasAnyRole } from "../auth/roles";
import NavbarIdentity from "../components/NavbarIdentity";
import { authFetch } from "../auth/authFetch";
import { useEffect, useState } from "react";

type LeaderboardEntry = {
  name: string;
  amount: number;
};


function Leaderboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [entriesAdd, setEntriesAdd] = useState<LeaderboardEntry[]>([]);
  const [entriesRedeem, setEntriesRedeem] = useState<LeaderboardEntry[]>([]);


  useEffect(() => {
    async function getLeaderboardAdd() {
      const response = await authFetch("http://localhost:3001/api/leaderboard/add");

      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }

      const data = await response.json();
      setEntriesAdd(data);
    };

    async function getLeaderboardRedeem() {
      const response = await authFetch("http://localhost:3001/api/leaderboard/redeem");

      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }

      const data = await response.json();
      setEntriesRedeem(data);
    };

    void getLeaderboardAdd();
    void getLeaderboardRedeem();
  }, []);

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
            onClick={() => navigate("/gudar")}
            className="rounded-xl p-3 text-left hover:bg-slate-700"
          >
            Gudar
          </button>
          {hasAnyRole(["ADMIN", "BONGMEISTER"]) && (
            <button
              onClick={() => navigate("/bongmeister")}
              className="rounded-xl p-3 text-left hover:bg-slate-700"
            >
              Bongmeister
            </button>
          )}
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

      <main className="grid gap-6 px-4 pt-16 lg:grid-cols-2">
        <section className="rounded-3xl border border-blue-900/30 bg-slate-800/90 p-5 shadow-2xl">
          <h2 className="mb-5 text-2xl font-bold text-blue-400">
            Bongar mottagna
          </h2>
          {entriesAdd.map((entry, index) => (
            <div key={entry.name}>
              #{index + 1} {entry.name}: {entry.amount}
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-blue-900/30 bg-slate-800/90 p-5 shadow-2xl">
          <h2 className="mb-5 text-2xl font-bold text-blue-400">
            Bongar tagna
          </h2>
          {entriesRedeem.map((entry, index) => (
            <div key={entry.name}>
              #{index + 1} {entry.name}: {entry.amount}
            </div>
          ))}
        </section>

        
      </main>
    </div>
  );
}

export default Leaderboard;
