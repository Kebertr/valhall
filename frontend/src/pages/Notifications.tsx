import { useState } from "react";
import { useNavigate } from "react-router-dom";
import valhallLogo from "../assets/valhall.jpg";

type Notification = {
  id: number;
  title: string;
  message: string;
  actionable: boolean;
  status?: "accepted" | "denied";
};

const initialNotifications: Notification[] = [
  {
    id: 1,
    title: "Redemption request",
    message: "Joel wants to redeem 2 bongs.",
    actionable: true,
  },
  {
    id: 2,
    title: "You received a bong",
    message: "Anton gave you 1 bong for arriving late.",
    actionable: false,
  },
  {
    id: 3,
    title: "Redemption request",
    message: "Filip submitted a video for 3 redeemed bongs.",
    actionable: true,
  },
  {
    id: 4,
    title: "Redemption approved",
    message: "Your redemption of 1 bong was approved.",
    actionable: false,
  },
];

function Notifications() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const navigate = useNavigate();

  function answerNotification(id: number, status: "accepted" | "denied") {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, status } : notification,
      ),
    );
  }

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
          <button onClick={() => navigate("/leaderboard")} className="rounded-xl p-3 text-left hover:bg-slate-700">Leaderboard</button>
          <button onClick={() => navigate("/gudar")} className="rounded-xl p-3 text-left hover:bg-slate-700">Gudar</button>

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

      <main className="px-4 pt-16">
        <section className="rounded-3xl border border-blue-900/30 bg-slate-800/90 p-5 shadow-2xl">
          <h2 className="mb-6 text-3xl font-bold text-blue-400">Notifications</h2>

          <div className="space-y-4">
            {notifications.map((notification) => (
              <article key={notification.id} className="rounded-2xl bg-slate-700/70 p-5">
                <div className="flex gap-4">
                  <div>
                    <h3 className="text-lg font-bold">{notification.title}</h3>
                    <p className="mt-1 text-slate-300">{notification.message}</p>
                  </div>
                </div>

                {notification.actionable && !notification.status && (
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => answerNotification(notification.id, "denied")}
                      className="rounded-xl bg-red-700 py-3 font-bold transition hover:bg-red-800"
                    >
                      Deny
                    </button>
                    <button
                      onClick={() => answerNotification(notification.id, "accepted")}
                      className="rounded-xl bg-green-700 py-3 font-bold transition hover:bg-green-800"
                    >
                      Accept
                    </button>
                  </div>
                )}

                {notification.status && (
                  <p className={`mt-4 font-bold ${notification.status === "accepted" ? "text-green-400" : "text-red-400"}`}>
                    {notification.status === "accepted" ? "Accepted" : "Denied"}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Notifications;
