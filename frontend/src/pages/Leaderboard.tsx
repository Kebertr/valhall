import { useState } from "react";
import { useNavigate } from "react-router-dom";
import valhallLogo from "../assets/valhall.jpg";

const received = [
  { name: "Joel", amount: 18 },
  { name: "Anton", amount: 14 },
  { name: "Rasmus", amount: 11 },
  { name: "Filip", amount: 8 },
];

const redeemed = [
  { name: "Rasmus", amount: 12 },
  { name: "Joel", amount: 10 },
  { name: "Filip", amount: 7 },
  { name: "Anton", amount: 5 },
];

function Ranking({ entries }: { entries: typeof received }) {
  return (
    <div className="space-y-3">
      {entries.map((entry, index) => (
        <div key={entry.name} className="flex items-center rounded-2xl bg-slate-700/70 p-4">
          <span className="w-12 text-xl font-bold text-blue-400">#{index + 1}</span>
          <span className="flex-1 text-lg font-semibold">{entry.name}</span>
          <span className="rounded-xl bg-slate-900/60 px-4 py-2 font-bold">{entry.amount}</span>
        </div>
      ))}
    </div>
  );
}

function Leaderboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-16 text-white">
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setMenuOpen(false)} />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-slate-800 shadow-2xl transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-slate-700 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 font-bold">R</div>
            <div>
              <p className="font-semibold">Rasmus</p>
              <p className="text-sm text-slate-400">ACTIVE</p>
            </div>
          </div>
        </div>

        <nav className="flex flex-col p-4">
          <button onClick={() => navigate("/")} className="rounded-xl p-3 text-left hover:bg-slate-700">Home</button>
          <button onClick={() => navigate("/add")} className="rounded-xl p-3 text-left hover:bg-slate-700">Add Shot</button>
          <button onClick={() => navigate("/redeem")} className="rounded-xl p-3 text-left hover:bg-slate-700">Redeem Shot</button>
          <button onClick={() => navigate("/gudar")} className="rounded-xl p-3 text-left hover:bg-slate-700">Gudar</button>
          <button onClick={() => navigate("/notifications")} className="rounded-xl p-3 text-left hover:bg-slate-700">Notifications</button>

          <div className="mt-8 border-t border-slate-700 pt-4">
            <button onClick={() => navigate("/profile")} className="w-full rounded-xl p-3 text-left hover:bg-slate-700">Edit Profile</button>
            <button className="w-full rounded-xl p-3 text-left hover:bg-slate-700">Logout</button>
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
            Menu
          </button>
          <div className="absolute top-4 left-1/2 flex -translate-x-1/2 flex-col items-center">
            <img src={valhallLogo} alt="Valhall Logo" className="h-24 w-auto object-contain" />
            <h1 className="mt-2 text-3xl font-bold tracking-wider text-blue-500">Valhall</h1>
          </div>
        </div>
      </header>

      <main className="grid gap-6 px-4 pt-16 lg:grid-cols-2">
        <section className="rounded-3xl border border-blue-900/30 bg-slate-800/90 p-5 shadow-2xl">
          <h2 className="mb-5 text-2xl font-bold text-blue-400">Bongs received</h2>
          <Ranking entries={received} />
        </section>

        <section className="rounded-3xl border border-red-900/30 bg-slate-800/90 p-5 shadow-2xl">
          <h2 className="mb-5 text-2xl font-bold text-red-400">Bongs redeemed</h2>
          <Ranking entries={redeemed} />
        </section>
      </main>
    </div>
  );
}

export default Leaderboard;
