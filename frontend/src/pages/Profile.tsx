import { useState } from "react";
import { useNavigate } from "react-router-dom";
import valhallLogo from "../assets/valhall.jpg";

function Profile() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-24 text-white">
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
          <button onClick={() => navigate("/leaderboard")} className="rounded-xl p-3 text-left hover:bg-slate-700">Leaderboard</button>
          <button onClick={() => navigate("/gudar")} className="rounded-xl p-3 text-left hover:bg-slate-700">Gudar</button>
          <button onClick={() => navigate("/notifications")} className="rounded-xl p-3 text-left hover:bg-slate-700">Notifications</button>

          <div className="mt-8 border-t border-slate-700 pt-4">
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
            ☰
          </button>
          <div className="absolute top-4 left-1/2 flex -translate-x-1/2 flex-col items-center">
            <img src={valhallLogo} alt="Valhall Logo" className="h-24 w-auto object-contain" />
            <h1 className="mt-2 text-3xl font-bold tracking-wider text-blue-500">Valhall</h1>
          </div>
        </div>
      </header>

      <main className="px-4 pt-16">
        <section className="rounded-3xl border border-blue-900/30 bg-slate-800/90 p-6 text-center shadow-2xl">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-blue-500 bg-slate-700 text-5xl shadow-lg">
            R
          </div>

          <p className="mt-6 text-sm font-semibold tracking-widest text-slate-400 uppercase">Godname</p>
          <h2 className="mt-1 text-3xl font-bold text-blue-400">Odin</h2>

          <button className="mt-8 w-full rounded-2xl bg-blue-600 py-4 text-lg font-bold transition hover:bg-blue-700">
            Change Profile
          </button>
        </section>
      </main>
    </div>
  );
}

export default Profile;
