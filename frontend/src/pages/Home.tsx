import { useEffect, useState } from "react";
import valhallLogo from ".././assets/valhall.jpg";
import ".././App.css";
import { useNavigate } from "react-router-dom";
import LogoutButton from "../auth/LogoutButton";
import { hasAnyRole } from "../auth/roles";
import NavbarIdentity from "../components/NavbarIdentity";
import { authFetch } from "../auth/authFetch";

const apiUrl = import.meta.env.VITE_API_URL ?? "";

type ActivityStatus = "PENDING" | "APPROVED" | "DENIED";

type RecentActivity =
  | {
      type: "ADD";
      fromName: string;
      toName: string;
      amount: number;
      reason: string;
      status: ActivityStatus;
      createdAt: string;
    }
  | {
      type: "REDEMPTION";
      memberName: string;
      amount: number;
      videoId: string;
      videoUrl: string | null;
      status: ActivityStatus;
      createdAt: string;
    };

type RecentActivitiesResponse = {
  result: RecentActivity[];
  oldestTimeStamp: { createdAt: string } | null;
};

const statusLabels: Record<ActivityStatus, string> = {
  PENDING: "Väntar",
  APPROVED: "Godkänd",
  DENIED: "Nekad",
};

function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [oldestTimeStamp, setOldestTimeStamp] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<
    Extract<RecentActivity, { type: "REDEMPTION" }> | null
  >(null);
  const navigate = useNavigate();

  async function addPlaybackUrls(items: RecentActivity[]) {
    const requests: Promise<RecentActivity>[] = [];

    for (const activity of items) {
      if (activity.type === "ADD") {
        requests.push(Promise.resolve(activity));
        continue;
      }

      requests.push(
        (async () => {
          const response = await authFetch(
            `${apiUrl}/api/files/${encodeURIComponent(activity.videoId)}/playback-url`,
          );

          if (response.status === 404) {
            return { ...activity, videoUrl: null };
          }

          if (!response.ok) {
            throw new Error("Kunde inte hämta videon");
          }

          const { videoUrl } = (await response.json()) as {
            videoUrl: string;
          };

          return { ...activity, videoUrl };
        })(),
      );
    }

    return Promise.all(requests);
  }

  useEffect(() => {
    let active = true;

    async function fetchRecentActivities() {
      try {
        const response = await authFetch("/api/recent/activities");

        if (!response.ok) {
          throw new Error("Kunde inte hämta senaste aktivitet");
        }

        const data = (await response.json()) as RecentActivitiesResponse;
        const activitiesWithVideos = await addPlaybackUrls(data.result);
        if (active) {
          setActivities(activitiesWithVideos);
          setOldestTimeStamp(data.oldestTimeStamp?.createdAt ?? null);
        }
      } catch (error) {
        if (active) {
          setActivityError(
            error instanceof Error
              ? error.message
              : "Kunde inte hämta senaste aktivitet",
          );
        }
      } finally {
        if (active) setIsLoadingActivities(false);
      }
    }

    void fetchRecentActivities();

    return () => {
      active = false;
    };
  }, []);

  async function handleLoadMore() {
    if (!oldestTimeStamp || isLoadingMore) return;

    try {
      setIsLoadingMore(true);
      setActivityError(null);

      const response = await authFetch(
        `/api/recent/activities?timestamp=${encodeURIComponent(oldestTimeStamp)}`,
      );

      if (!response.ok) {
        throw new Error("Kunde inte hämta fler aktiviteter");
      }

      const data = (await response.json()) as RecentActivitiesResponse;
      const activitiesWithVideos = await addPlaybackUrls(data.result);
      setActivities((current) => [...current, ...activitiesWithVideos]);
      setOldestTimeStamp(data.oldestTimeStamp?.createdAt ?? null);
    } catch (error) {
      setActivityError(
        error instanceof Error
          ? error.message
          : "Kunde inte hämta fler aktiviteter",
      );
    } finally {
      setIsLoadingMore(false);
    }
  }

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
          <NavbarIdentity />
        </div>

        <nav className="flex flex-col p-4">
          <button
            aria-label="Add shot from menu"
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
            Senaste aktivitet
          </h2>

          {isLoadingActivities && (
            <p className="text-slate-400">Laddar senaste aktivitet...</p>
          )}

          {activityError && <p className="text-red-300">{activityError}</p>}

          {!isLoadingActivities && !activityError && activities.length === 0 && (
            <p className="text-slate-400">Det finns ingen aktivitet ännu.</p>
          )}

          <div className="space-y-4">
            {activities.map((activity, index) => (
              <article
                key={`${activity.type}-${activity.createdAt}-${index}`}
                className="flex flex-wrap items-center gap-4 rounded-2xl bg-slate-700/70 p-5 transition hover:bg-slate-700"
              >
                {activity.type === "REDEMPTION" && activity.videoUrl && (
                  <button
                    type="button"
                    onClick={() => setSelectedVideo(activity)}
                    className="shrink-0 overflow-hidden rounded-xl bg-black ring-1 ring-slate-600 transition hover:ring-blue-400"
                    aria-label={`Visa video från ${activity.memberName}`}
                  >
                    <video
                      src={activity.videoUrl}
                      muted
                      preload="metadata"
                      playsInline
                      className="h-20 w-28 object-cover"
                    />
                  </button>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                  <p className="text-lg">
                    {activity.type === "ADD" ? (
                      <>
                        <span className="font-semibold">
                          {activity.fromName}
                        </span>
                        {" gav "}
                        <span className="font-semibold">
                          {activity.toName}
                        </span>
                        {` ${activity.amount} ${activity.amount === 1 ? "bong" : "bongar"}`}
                      </>
                    ) : (
                      <>
                        <span className="font-semibold">
                          {activity.memberName}
                        </span>
                        {` vill bli av med ${activity.amount} ${activity.amount === 1 ? "bong" : "bongar"}`}
                      </>
                    )}
                  </p>

                  <span
                    className={`shrink-0 font-semibold ${
                      activity.type === "ADD"
                        ? "text-blue-300"
                        : "text-red-300"
                    }`}
                  >
                    {statusLabels[activity.status]}
                  </span>
                  </div>

                  {activity.type === "ADD" && activity.reason && (
                    <p className="mt-1 text-sm text-slate-400">
                      {activity.reason}
                    </p>
                  )}

                  <p className="mt-2 text-sm text-slate-400">
                    {new Date(activity.createdAt).toLocaleString("sv-SE")}
                  </p>
                </div>
              </article>
            ))}
          </div>

          {oldestTimeStamp && (
            <button
              type="button"
              onClick={() => void handleLoadMore()}
              disabled={isLoadingMore}
              className="mt-5 w-full rounded-2xl border border-blue-500 py-4 text-lg font-bold text-blue-400 transition hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoadingMore ? "Laddar..." : "Visa fler"}
            </button>
          )}
        </div>
      </main>

      {selectedVideo?.videoUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Video från ${selectedVideo.memberName}`}
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="relative w-full max-w-4xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedVideo(null)}
              className="absolute -top-12 right-0 rounded-lg bg-slate-800 px-4 py-2 font-semibold hover:bg-slate-700"
            >
              Stäng
            </button>
            <video
              src={selectedVideo.videoUrl}
              controls
              autoPlay
              playsInline
              className="max-h-[80vh] w-full rounded-2xl bg-black"
            />
          </div>
        </div>
      )}

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
          <button
            aria-label="Add shot from footer"
            onClick={() => navigate("/add")}
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
            Ge bong
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
            Bli av med bong
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;
