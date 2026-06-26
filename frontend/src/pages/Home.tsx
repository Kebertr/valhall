import { useState } from "react";
import valhallLogo from ".././assets/valhall.jpg";
import ".././App.css";
import { useNavigate } from "react-router-dom";
import LogoutButton from "../auth/LogoutButton";

function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const activities = [
    { text: "Anton gave Joel 2 shots" },
    { text: "Rasmus redeemed 1 shot" },
    { text: "Joel received 3 shots" },
    { text: "Master approved Anton's redemption" },
    { text: "Filip got 2 shots for being late" },
    { text: "Joel redeemed 2 shots" },
    { text: "Anton received 1 shot" },
    { text: "Master denied a redemption request" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white pb-24">
      {/* Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-slate-800 shadow-2xl transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
    
        <div className="border-b border-slate-700 p-6">
          <div className="flex items-center gap-3">
            <div
              className="
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-full
                bg-blue-600
                font-bold
              "
            >
              R
            </div>

            <div>
              <p className="font-semibold">
                Rasmus
              </p>

              <p className="text-sm text-slate-400">
                ACTIVE
              </p>
            </div>
          </div>
        </div>


        <nav className="flex flex-col p-4">
          <button aria-label="Add shot from menu" onClick={() => navigate("/add")}className="rounded-xl p-3 text-left hover:bg-slate-700">
            Add Shot
          </button>

          <button onClick={() => navigate("/redeem")} className="rounded-xl p-3 text-left hover:bg-slate-700">
            Redeem Shot
          </button>

          <button onClick={() => navigate("/leaderboard")} className="rounded-xl p-3 text-left hover:bg-slate-700">
            Leaderboard
          </button>

          <button onClick={() => navigate("/gudar")} className="rounded-xl p-3 text-left hover:bg-slate-700">
            Gudar
          </button>

          <button onClick={() => navigate("/notifications")} className="rounded-xl p-3 text-left hover:bg-slate-700">
            Notifications
          </button>

        <div className="mt-8 border-t border-slate-700 pt-4">
          <button onClick={() => navigate("/profile")} className="w-full rounded-xl p-3 text-left hover:bg-slate-700">
            Edit Profile
          </button>

          <LogoutButton className="w-full rounded-xl p-3 text-left hover:bg-slate-700" />
        </div>

        </nav>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="relative flex min-h-[160px] items-start p-4">

          {/* Menu Button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="z-10 rounded-lg p-2 text-2xl hover:bg-slate-800"
          >
            ☰
          </button>

          {/* Centered Logo + Title */}
          <div className="absolute left-1/2 top-4 flex -translate-x-1/2 flex-col items-center">
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

      {/* Main */}
      <main className="px-4 pt-16">
        <div className="rounded-3xl border border-blue-900/30 bg-slate-800/90 p-5 shadow-2xl">
          <h2 className="mb-6 text-3xl font-bold text-blue-400">
            Recent Activity
          </h2>

          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div
                key={index}
                className="
                  flex
                  items-center
                  gap-4
                  rounded-2xl
                  bg-slate-700/70
                  p-5
                  transition
                  hover:bg-slate-700
                "
              >
                <span className="text-lg">
                  {activity.text}
                </span>
              </div>
            ))}
          </div>

          <button
            className="
              mt-5
              w-full
              rounded-2xl
              border
              border-blue-500
              py-4
              text-lg
              font-bold
              text-blue-500
              transition
              hover:bg-blue-500/10
            "
          >
            View More
          </button>
        </div>
      </main>

      {/* Bottom Action Bar */}
      <div
        className="
          fixed
          bottom-0
          left-0
          right-0
          border-t
          border-slate-800
          bg-slate-950/95
          p-4
          backdrop-blur
        "
      >
        <div className="flex gap-3">
          <button aria-label="Add shot from footer" onClick={() => navigate("/add")}
            className="
              flex-1
              rounded-2xl
              bg-blue-600
              py-4
              text-lg
              font-bold
              text-white
              transition
              hover:bg-blue-700
            "
          >
            Add Shot
          </button>

          <button
            onClick={() => navigate("/redeem")}
            className="
              flex-1
              rounded-2xl
              bg-red-700
              py-4
              text-lg
              font-bold
              text-white
              transition
              hover:bg-red-800
            "
          >
            Redeem Shot
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;
