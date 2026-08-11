import { useState } from "react";
import Navbar from "../components/Navbar";

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
  const [notifications, setNotifications] = useState(initialNotifications);

  function answerNotification(id: number, status: "accepted" | "denied") {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, status } : notification,
      ),
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-16 text-white">
      <Navbar />

      <main className="px-4 pt-16">
        <section className="rounded-3xl border border-blue-900/30 bg-slate-800/90 p-5 shadow-2xl">
          <h2 className="mb-6 text-3xl font-bold text-blue-400">
            Notifications
          </h2>

          <div className="space-y-4">
            {notifications.map((notification) => (
              <article
                key={notification.id}
                className="rounded-2xl bg-slate-700/70 p-5"
              >
                <div className="flex gap-4">
                  <div>
                    <h3 className="text-lg font-bold">{notification.title}</h3>
                    <p className="mt-1 text-slate-300">
                      {notification.message}
                    </p>
                  </div>
                </div>

                {notification.actionable && !notification.status && (
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      onClick={() =>
                        answerNotification(notification.id, "denied")
                      }
                      className="rounded-xl bg-red-700 py-3 font-bold transition hover:bg-red-800"
                    >
                      Deny
                    </button>
                    <button
                      onClick={() =>
                        answerNotification(notification.id, "accepted")
                      }
                      className="rounded-xl bg-green-700 py-3 font-bold transition hover:bg-green-800"
                    >
                      Accept
                    </button>
                  </div>
                )}

                {notification.status && (
                  <p
                    className={`mt-4 font-bold ${notification.status === "accepted" ? "text-green-400" : "text-red-400"}`}
                  >
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
