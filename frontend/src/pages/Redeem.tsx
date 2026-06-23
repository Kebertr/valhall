import { useState } from "react";
import { useNavigate } from "react-router-dom";
import valhallLogo from "../assets/valhall.jpg";

function Redeem() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [amount, setAmount] = useState(1);
  const [video, setVideo] = useState<File | null>(null);
  const navigate = useNavigate();

  const redemptions = [
    { icon: "🍺", text: "Rasmus redeemed 1 bong" },
    { icon: "🍺", text: "Joel redeemed 2 bongs" },
    { icon: "👑", text: "Master approved Anton's redemption" },
  ];

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    console.log("Redemption:", { amount, video });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-24 text-white">
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
          <button onClick={() => navigate("/")} className="rounded-xl p-3 text-left hover:bg-slate-700">
            Home
          </button>
          <button onClick={() => navigate("/add")} className="rounded-xl p-3 text-left hover:bg-slate-700">
            Add Shot
          </button>
          <button onClick={() => navigate("/leaderboard")} className="rounded-xl p-3 text-left hover:bg-slate-700">
            Leaderboard
          </button>
          <button onClick={() => navigate("/notifications")} className="rounded-xl p-3 text-left hover:bg-slate-700">
            Notifications
          </button>

          <div className="mt-8 border-t border-slate-700 pt-4">
            <button onClick={() => navigate("/profile")} className="w-full rounded-xl p-3 text-left hover:bg-slate-700">
              Edit Profile
            </button>
            <button className="w-full rounded-xl p-3 text-left hover:bg-slate-700">
              Logout
            </button>
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
            <img src={valhallLogo} alt="Valhall Logo" className="h-24 w-auto object-contain" />
            <h1 className="mt-2 text-3xl font-bold tracking-wider text-blue-500">Valhall</h1>
          </div>
        </div>
      </header>

      <main className="space-y-6 px-4 pt-16">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-red-900/30 bg-slate-800/90 p-5 shadow-2xl"
        >
          <h2 className="mb-5 text-3xl font-bold text-red-400">Redeem bongs</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block font-semibold">Bongs taken</span>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
                className="w-full rounded-xl bg-slate-700 p-4 text-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block font-semibold">Add video</span>
              <input
                type="file"
                accept="video/*"
                onChange={(event) => setVideo(event.target.files?.[0] ?? null)}
                className="w-full rounded-xl bg-slate-700 p-3 text-sm text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:font-semibold file:text-white"
              />
            </label>
          </div>

          <button
            type="submit"
            className="mt-5 w-full rounded-2xl bg-red-700 py-4 text-lg font-bold transition hover:bg-red-800"
          >
            ⚔️ Send redemption
          </button>
        </form>

        <section className="rounded-3xl border border-blue-900/30 bg-slate-800/90 p-5 shadow-2xl">
          <h2 className="mb-5 text-2xl font-bold text-blue-400">Recent redemptions</h2>
          <div className="space-y-4">
            {redemptions.map((redemption) => (
              <div key={redemption.text} className="flex items-center gap-4 rounded-2xl bg-slate-700/70 p-5">
                <span className="text-2xl">{redemption.icon}</span>
                <span className="text-lg">{redemption.text}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <div className="fixed right-0 bottom-0 left-0 border-t border-slate-800 bg-slate-950/95 p-4 backdrop-blur">
        <button
          onClick={() => navigate("/add")}
          aria-label="Add shot from footer"
          className="w-full rounded-2xl bg-blue-600 py-4 text-lg font-bold text-white transition hover:bg-blue-700"
        >
          🍺 Add Shot
        </button>
      </div>
    </div>
  );
}

export default Redeem;
