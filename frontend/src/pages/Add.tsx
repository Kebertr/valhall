import { useEffect, useMemo, useState } from "react";
import "../App.css";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../auth/authFetch";
import Navbar from "../components/Navbar";
import { getKeycloak } from "../auth/keycloak";

type Member = {
  id: string;
  name: string;
  godname: string;
  avatarUrl: string | null;
};

type RecentActivity = {
  id: string;
  fromName: string;
  toName: string;
  amount: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "DENIED";
  acceptedByName: string | null;
  createdAt: string;
};

const statusLabels = {
  PENDING: "Väntar",
  APPROVED: "OK",
  DENIED: "Nekad",
};

function activityStatus(activity: RecentActivity) {
  const label = statusLabels[activity.status];

  if (activity.status === "PENDING" || !activity.acceptedByName) {
    return label;
  }

  return `${label} av ${activity.acceptedByName}`;
}

async function getRecentActivity(skip = 0) {
  let url;
  if (skip > 0){
    url = `/api/add/recent?skip=${skip}`
  }else{
    url = "/api/add/recent"
  }
  const response = await authFetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch recent activity");
  }

  return (await response.json()) as RecentActivity[];
}

function AddShot() {
  const [amount, setAmount] = useState(1);
  const [reason, setReason] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [isLoadingMoreActivities, setIsLoadingMoreActivities] = useState(false);
  const navigate = useNavigate();
  const roles =
    (
      getKeycloak().tokenParsed as
        { realm_access?: { roles?: string[] } } | undefined
    )?.realm_access?.roles ?? [];
  const isBongmeister = roles.some((role) =>
    ["ADMIN", "BONGMEISTER"].includes(role.toUpperCase()),
  );

  useEffect(() => {
    async function fetchMembers() {
      try {
        const response = await authFetch("/api/members/shot-targets");

        if (!response.ok) throw new Error("Failed to fetch members");

        const data = (await response.json()) as Member[];

          setMembers(data);
      } catch (error) {
        if (error instanceof Error){
            setMembersError(error.message)
        }else{
          setMembersError(
              "Kunde inte ladda in medlem",
          );
        }
      } finally {
        setIsLoadingMembers(false);
      }
    }

    void fetchMembers();
  }, []);

  useEffect(() => {
    getRecentActivity()
      .then((recentActivity) => {
          setActivityError(null);
          setActivities(recentActivity);
      })
      .catch((error) => {
          if (error instanceof Error){
            setActivityError(error.message)
          }else{
            setActivityError(
                "Kunde inte hämta senaste aktivitet",
            );
          }
      });
  }, []);

  async function refreshRecentActivity() {
    try {
      const recentActivity = await getRecentActivity();
      setActivityError(null);
      setActivities(recentActivity);
    } catch (error) {
      setActivityError(
        error instanceof Error
          ? error.message
          : "Kunde inte hämta senaste aktivitet",
      );
    }
  }

  const matchingMembers = useMemo(() => {
    const query = memberQuery.trim().toLocaleLowerCase();

    if (!query || selectedMember) {
      return [];
    }

    return members
      .filter((member) =>
        `${member.name} ${member.godname}`.toLocaleLowerCase().includes(query),
      )
      .slice(0, 8);
  }, [memberQuery, members, selectedMember]);

  async function handleLoadMoreActivities() {
    if (isLoadingMoreActivities) return;

    try {
      setIsLoadingMoreActivities(true);
      const nextActivities = await getRecentActivity(activities.length);
      setActivities((current) => [...current, ...nextActivities]);

      if (nextActivities.length === 0) {
        window.alert("Det finns inga fler aktiviteter.");
      }
    } catch (error) {
      if (error instanceof Error){
        setActivityError(error.message)
      }else{
        setActivityError(
          "Kunde inte hämta senaste aktivitet",
        );
      }
    } finally {
      setIsLoadingMoreActivities(false);
    }
  }

  async function moderateActivity(
    activity: RecentActivity,
    action: "APPROVE" | "REJECT",
    reviewedAmount?: number,
  ) {
    const response = await authFetch(`/api/bongmeister/${activity.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        ...(reviewedAmount !== undefined
          ? { amount: reviewedAmount }
          : {}),
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      if (body?.message){
        window.alert(body?.message)
      }else{
        window.alert("Kunde inte hantera bongen")
      }
      return;
    }

    const updated = (await response.json()) as RecentActivity;
    setActivities((current) =>
      current.map((item) =>
        item.id === activity.id
          ? {
              ...item,
              amount: updated.amount,
              reason: updated.reason,
              status: updated.status,
            }
          : item,
      ),
    );
  }

  function editAndApprove(activity: RecentActivity) {
    const amountText = window.prompt("Antal", String(activity.amount));
    if (amountText === null) return;

    const reviewedAmount = Number(amountText);
    if (!Number.isInteger(reviewedAmount) || reviewedAmount < 1) {
      window.alert("Antal måste vara ett heltal på minst 1.");
      return;
    }

    void moderateActivity(activity, "APPROVE", reviewedAmount);
  }

  async function handleAddShot() {
    if (!selectedMember || amount < 1) {
      setSubmitMessage("Choose a member from the suggestions and an amount.");
      return;
    }

    try {
      setSubmitMessage(null);

      const response = await authFetch(`/api/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Id: selectedMember.id,
          amount: amount,
          reason: reason,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;

        throw new Error(body?.message ?? "Failed to add shot");
      }

      await response.json();

      setSelectedMember(null);
      setMemberQuery("");
      setAmount(1);
      setReason("");
      setSubmitMessage("Shot added.");
      await refreshRecentActivity();
    } catch (error) {
      if (error instanceof Error){
        setSubmitMessage(error.message)
      }else{
        setSubmitMessage(
            "Kunde inte addera bongen",
        );
      }
    }
  }
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white pb-24">
      <Navbar />

      <main className="px-4 pt-16">
        <div className="rounded-3xl border border-blue-900/30 bg-slate-800/90 p-5 shadow-2xl">
          <h2 className="mb-6 text-3xl font-bold text-blue-400">Ge bong</h2>
          <div className="relative mb-5">
            <label className="mb-2 block text-lg font-semibold">Medlem</label>

            <input
              type="text"
              value={memberQuery}
              placeholder={
                isLoadingMembers ? "Laddar medlemmar..." : "Sök efter namn..."
              }
              disabled={isLoadingMembers || Boolean(membersError)}
              autoComplete="off"
              onChange={(e) => {
                setMemberQuery(e.target.value);
                setSelectedMember(null);
                setSubmitMessage(null);
              }}
              className="w-full rounded-xl bg-slate-700 p-4 text-white disabled:opacity-60"
            />

            {membersError && (
              <p className="mt-2 text-sm text-red-300">{membersError}</p>
            )}

            {matchingMembers.length > 0 && (
              <ul className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-600 bg-slate-800 shadow-2xl">
                {matchingMembers.map((member) => (
                  <li key={member.id}>
                    <button
                      type="button"
                      aria-label={`${member.godname}, ${member.name}`}
                      onClick={() => {
                        setSelectedMember(member);
                        setMemberQuery(`${member.godname} (${member.name})`);
                      }}
                      className="flex w-full items-center gap-3 border-b border-slate-700 p-3 text-left last:border-0 hover:bg-slate-700"
                    >
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold">
                          {member.godname.charAt(0)}
                        </span>
                      )}
                      <span>
                        <span className="block font-semibold">
                          {member.godname}
                        </span>
                        <span className="block text-sm text-slate-400">
                          {member.name}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {memberQuery.trim() &&
              !selectedMember &&
              !isLoadingMembers &&
              !membersError &&
              matchingMembers.length === 0 && (
                <p className="mt-2 text-sm text-slate-400">
                  Inga matchande medlemmar.
                </p>
              )}
          </div>

          {/* Amount */}
          <div className="mb-5">
            <label className="mb-2 block text-lg font-semibold">Antal</label>
            <input
              type="number"
              min="1"
              enterKeyHint="done"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className=" w-full rounded-xl bg-slate-700 p-4 text-white text-lg "
            />
          </div>

          {/* Reason */}
          <div className="mb-5">
            <label className="mb-2 block text-lg font-semibold">
              Anledning
            </label>

            <textarea
              value={reason}
              placeholder="Anledning..."
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[120px] w-full rounded-xl bg-slate-700 p-4 text-white"
            />
          </div>

          {submitMessage && (
            <p className="mb-4 text-sm text-slate-200" role="status">
              {submitMessage}
            </p>
          )}

          <button
            onClick={handleAddShot}
            disabled={!selectedMember || amount < 1}
            className="
              w-full
              rounded-2xl
              bg-blue-600
              py-4
              text-lg
              font-bold
              text-white
              transition
              hover:bg-blue-700
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            Ge bong
          </button>
        </div>

        <section className="mt-6 rounded-3xl border border-blue-900/30 bg-slate-800/90 p-5 shadow-2xl">
          <h2 className="mb-6 text-3xl font-bold text-blue-400">
            Senaste aktivitet
          </h2>

          {activityError && <p className="text-red-300">{activityError}</p>}

          {!activityError && activities.length === 0 && (
            <p className="text-slate-400">Inga bongar har delats ut ännu.</p>
          )}

          <div className="space-y-4">
            {activities.map((activity) => (
              <article
                key={activity.id}
                className="rounded-2xl bg-slate-700/70 p-5 transition hover:bg-slate-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-lg">
                    <span className="font-semibold">{activity.fromName}</span>
                    {" gav "}
                    <span className="font-semibold">{activity.toName}</span>
                    {` ${activity.amount} ${activity.amount === 1 ? "bong" : "bongar"}`}
                  </p>
                  <span className="font-semibold text-slate-300">
                    {activityStatus(activity)}
                  </span>
                </div>
                {activity.reason && (
                  <p className="mt-1 text-sm text-slate-400">
                    {activity.reason}
                  </p>
                )}

                <p className="mt-2 text-sm text-slate-400">
                  {new Date(activity.createdAt).toLocaleString("sv-SE")}
                </p>

                {isBongmeister && activity.status === "PENDING" && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void moderateActivity(activity, "APPROVE")}
                      className="rounded-lg bg-green-700 px-4 py-2 font-semibold hover:bg-green-600"
                    >
                      Godkänn
                    </button>
                    <button
                      type="button"
                      onClick={() => editAndApprove(activity)}
                      className="rounded-lg bg-blue-700 px-4 py-2 font-semibold hover:bg-blue-600"
                    >
                      Ändra
                    </button>
                    <button
                      type="button"
                      onClick={() => void moderateActivity(activity, "REJECT")}
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
            onClick={handleLoadMoreActivities}
            disabled={isLoadingMoreActivities}
            className="mt-5 w-full rounded-xl bg-slate-700 px-4 py-3 font-semibold transition hover:bg-slate-600"
          >
            {isLoadingMoreActivities ? "Laddar..." : "Visa fler"}
          </button>
        </section>
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
        <button
          onClick={() => navigate("/redeem")}
          className="
            w-full
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
  );
}

export default AddShot;
