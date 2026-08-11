import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../auth/authFetch";
import Navbar from "../components/Navbar";
import { getKeycloak } from "../auth/keycloak";

const apiUrl = import.meta.env.VITE_API_URL ?? "";

type RecentRedemptionResponse = {
  id: string;
  memberName: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "DENIED";
  createdAt: string;
  videoId: string;
  acceptedByName?: string;
};

type RecentRedemption = {
  id: string;
  memberName: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "DENIED";
  createdAt: string;
  videoId: string;
  videoUrl: string;
  acceptedByName?: string;
};

const redemptionStatusLabels = {
  PENDING: "Väntar",
  APPROVED: "OK",
  DENIED: "Nekad",
};

function Redeem() {
  const [amount, setAmount] = useState(1);
  const [video, setVideo] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [redemptions, setRedemptions] = useState<RecentRedemption[]>([]);
  const [recentSkip, setRecentSkip] = useState(0);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<RecentRedemption | null>(
    null,
  );
  const navigate = useNavigate();
  const roles =
    (
      getKeycloak().tokenParsed as
        | { realm_access?: { roles?: string[] } }
        | undefined
    )?.realm_access?.roles ?? [];
  const isBongmeister = roles.some((role) =>
    ["ADMIN", "BONGMEISTER"].includes(role.toUpperCase()),
  );

  async function getRecentRedemptions(skip = 0) {
    let query = "";
    if (skip < 0) {
      throw new Error("skip must be a non-negative integer");
    }else if (skip > 0){
      query = `?skip=${skip}`;
    }
    
    const response = await authFetch(
      `${apiUrl}/api/redemption/recent${query}`,
    );

    if (!response.ok) {
      throw new Error(
        "Kunde inte hämta senaste bongarna"
      );
    }

    const redemptions = (await response.json()) as RecentRedemptionResponse[];
    const playableRedemptions: RecentRedemption[] = [];

    for (const redemption of redemptions) {
      try {
        const videoResponse = await authFetch(
          `${apiUrl}/api/files/${encodeURIComponent(redemption.videoId)}/playback-url`,
        );

        if (!videoResponse.ok) {
          continue;
        }

        const data = (await videoResponse.json()) as {
          videoUrl: string;
        };

        playableRedemptions.push({
          ...redemption,
          videoUrl: data.videoUrl,
        });
      } catch {
        continue;
      }
    }

    return {
      items: playableRedemptions,
      nextSkip: skip + redemptions.length,
    };
  }

  useEffect(() => {

    getRecentRedemptions()
      .then((recent) => {

        setRedemptions(recent.items);
        setRecentSkip(recent.nextSkip);
        setActivityError(null);
      })
      .catch(() => {
          setActivityError("Kunde inte hämta senaste tagna bongar");
      });
  }, []);

  async function handleLoadMore() {
    if (isLoadingMore) return;

    try {
      setIsLoadingMore(true);

      const next = await getRecentRedemptions(recentSkip);

      setRedemptions((current) => [...current, ...next.items]);
      setRecentSkip(next.nextSkip);

      if (next.nextSkip === recentSkip) {
        window.alert("Det finns inga fler tagna bongar");
      }
    } catch {
      setActivityError("Kunde inte hämta fler tagna bongar");
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!video) {
      setSubmitError("Välj en video innan du skickar");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitMessage(null);

    try {
      const response = await authFetch(`${apiUrl}/api/redemption`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bongAmount: amount,
          filename: video.name,
          contentType: video.type,
          sizeBytes: video.size,
        }),
      });

      if(response.status === 409) {
        throw new Error("Du har inte så här många bongar");
      }

      if (response.status === 404) {
        throw new Error("Du verkar inte ha något saldo i bongdatabasen. Ring Bongmeister");
      }

      if (!response.ok) {
        throw new Error("Något gick fel");
      }

      const upload = (await response.json()) as {
        redemptionId: string;
        postUrl: string;
        formData: Record<string, string>;
      };

      const uploadBody = new FormData();

      for (const [key, value] of Object.entries(upload.formData)) {
        uploadBody.append(key, value);
      }

      uploadBody.append("file", video);

      const uploadResponse = await fetch(upload.postUrl, {
        method: "POST",
        body: uploadBody,
      });

      if (!uploadResponse.ok) {
        throw new Error(
          `Videouppladdningen misslyckades (${uploadResponse.status}).`,
        );
      }

      const completeResponse = await authFetch(
        `${apiUrl}/api/redemption/complete-upload`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            redemptionId: upload.redemptionId,
          }),
        },
      );

      if (!completeResponse.ok) {
        throw new Error("Den uppladdade videon kunde inte verifieras.");
      }

      setSubmitMessage("Din redemption är nu uppe och väntar på godkännande!");
      await getRecentRedemptions();
    } catch (error) {
      if (error instanceof Error){
        setSubmitError(error.message)
      }else{
        setSubmitError("Något gick fel i processen, kontakta Kebert")
      }
    } finally {
      setSubmitting(false);
    }
  }

  function activityStatus(Redemption: RecentRedemption): string {
    const label = redemptionStatusLabels[Redemption.status];

    if (Redemption.status === "PENDING" || !Redemption.acceptedByName) {
      return label;
    }

    return `${label} av ${Redemption.acceptedByName}`;
  }

  async function moderateActivity(
      activity: RecentRedemption,
      action: "APPROVE" | "REJECT",
      amount?: number,
    ) {
      const response = await authFetch(`/api/bongmeister/redeem/${activity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(amount !== undefined ? { amount } : {}),
        }),
      });
  
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        window.alert(body?.message ?? "Kunde inte hantera bongen.");
        return;
      }
  
      const updated = (await response.json()) as RecentRedemption;
      setRedemptions((current) =>
        current.map((item) =>
          item.id === activity.id
            ? {
                ...item,
                amount: updated.amount,
                status: updated.status,
              }
            : item,
        ),
      );
    }
  
    function editAndApprove(activity: RecentRedemption) {
      const amountText = window.prompt("Antal", String(activity.amount));
      if (amountText === null) return;
  
      const amount = Number(amountText);
      if (!Number.isInteger(amount) || amount < 1) {
        window.alert("Antal måste vara ett heltal på minst 1.");
        return;
      }
  
      void moderateActivity(activity, "APPROVE", amount);
    }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-24 text-white">
      <Navbar />

      <main className="space-y-6 px-4 pt-16">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-red-900/30 bg-slate-800/90 p-5 shadow-2xl"
        >
          <h2 className="mb-5 text-3xl font-bold text-red-400">Bli av med</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block font-semibold">Bongar tagna</span>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
                className="w-full rounded-xl bg-slate-700 p-4 text-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block font-semibold">Lägg till en video som bevis</span>
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
            disabled={submitting}
            className="mt-5 w-full rounded-2xl bg-red-700 py-4 text-lg font-bold transition hover:bg-red-800"
          >
            {submitting ? "Laddar upp videon" : "Skicka"}
          </button>

          {submitError && (
            <p role="alert" className="mt-3 text-red-300">
              {submitError}
            </p>
          )}

          {submitMessage && (
            <p role="status" className="mt-3 text-green-300">
              {submitMessage}
            </p>
          )}
        </form>

        <section className="rounded-3xl border border-blue-900/30 bg-slate-800/90 p-5 shadow-2xl">
          <h2 className="mb-5 text-2xl font-bold text-blue-400">
            Aktivitetslista för bongar tagna
          </h2>

          {activityError && <p className="text-red-300">{activityError}</p>}

          {!activityError && redemptions.length === 0 && (
            <p className="text-slate-400">Ingen har velat bli av med en bong</p>
          )}

          <div className="space-y-4">
            {redemptions.map((redemption) => (
              <article
                key={redemption.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl bg-slate-700/70 p-4"
              >
                <button
                  type="button"
                  onClick={() => setSelectedVideo(redemption)}
                  className="shrink-0 overflow-hidden rounded-xl bg-black ring-1 ring-slate-600 transition hover:ring-blue-400"
                  aria-label={`Visa video från ${redemption.memberName}`}
                >
                  <video
                    src={redemption.videoUrl}
                    muted
                    preload="metadata"
                    playsInline
                    className="h-20 w-28 object-cover"
                  />
                </button>

                <div className="min-w-0 flex-1">
                  <p className="text-lg">
                    <span className="font-semibold">
                      {redemption.memberName}
                    </span>{" "}
                    Vill bli av med {redemption.amount}{" "}
                    {redemption.amount === 1 ? "bong" : "bongar"}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {new Date(redemption.createdAt).toLocaleString("sv-SE")}
                  </p>
                </div>

                <span className="shrink-0 font-semibold text-slate-300">
                  {activityStatus(redemption)}
                </span>

                {isBongmeister && redemption.status === "PENDING" && (
                  <div className="mt-4 flex w-full flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void moderateActivity(redemption, "APPROVE")}
                      
                      className="rounded-lg bg-green-700 px-4 py-2 font-semibold hover:bg-green-600"
                    >
                      Godkänn
                    </button>
                    <button
                      type="button"
                      onClick={() => editAndApprove(redemption)}
                      className="rounded-lg bg-blue-700 px-4 py-2 font-semibold hover:bg-blue-600"
                    >
                      Ändra
                    </button>
                    <button
                      type="button"
                      onClick={() => void moderateActivity(redemption, "REJECT")}
                      
                      className="rounded-lg bg-red-700 px-4 py-2 font-semibold hover:bg-red-600"
                    >
                      Neka
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void handleLoadMore()}
            disabled={isLoadingMore}
            className="mt-5 w-full rounded-xl bg-slate-700 px-4 py-3 font-semibold transition hover:bg-slate-600 disabled:opacity-60"
          >
            {isLoadingMore ? "Laddar..." : "Visa fler"}
          </button>
        </section>
      </main>

      {selectedVideo && (
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

      <div className="fixed right-0 bottom-0 left-0 border-t border-slate-800 bg-slate-950/95 p-4 backdrop-blur">
        <button
          onClick={() => navigate("/add")}
          aria-label="Add shot from footer"
          className="w-full rounded-2xl bg-blue-600 py-4 text-lg font-bold text-white transition hover:bg-blue-700"
        >
          Ge bong
        </button>
      </div>
    </div>
  );
}

export default Redeem;
