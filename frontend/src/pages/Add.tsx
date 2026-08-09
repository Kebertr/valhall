import { useCallback, useEffect, useMemo, useState } from "react";
import valhallLogo from "../assets/valhall.jpg";
import "../App.css";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../auth/authFetch";
import LogoutButton from "../auth/LogoutButton";
import { getKeycloak } from "../auth/keycloak";
import { hasAnyRole } from "../auth/roles";
import NavbarIdentity from "../components/NavbarIdentity";

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
  const url = skip > 0 ? `/api/add/recent?skip=${skip}` : "/api/add/recent";
  const response = await authFetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch recent activity");
  }

  return (await response.json()) as RecentActivity[];
}

function AddShot() {
  const [menuOpen, setMenuOpen] = useState(false);
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

  const fetchRecentActivity = useCallback(async () => {
    try {
      const recentActivity = await getRecentActivity();
      setActivityError(null);
      setActivities(recentActivity);
    } catch (error) {
      setActivityError(
        error instanceof Error
          ? error.message
          : "Could not fetch recent activity",
      );
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function fetchMembers() {
      try {
        const response = await authFetch("/api/members/shot-targets");

        if (!response.ok) throw new Error("Failed to fetch members");

        const data = (await response.json()) as Member[];

        if (active) {
          setMembers(data);
        }
      } catch (error) {
        if (active) {
          setMembersError(
            error instanceof Error ? error.message : "Could not fetch members",
          );
        }
      } finally {
        if (active) {
          setIsLoadingMembers(false);
        }
      }
    }

    fetchMembers();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    getRecentActivity()
      .then((recentActivity) => {
        if (active) {
          setActivityError(null);
          setActivities(recentActivity);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setActivityError(
            error instanceof Error
              ? error.message
              : "Could not fetch recent activity",
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

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
      setActivityError(
        error instanceof Error
          ? error.message
          : "Kunde inte hämta fler aktiviteter",
      );
    } finally {
      setIsLoadingMoreActivities(false);
    }
  }

  async function moderateActivity(
    activity: RecentActivity,
    action: "APPROVE" | "REJECT",
    amount?: number,
  ) {
    const response = await authFetch(`/api/bongmeister/${activity.id}`, {
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

    const amount = Number(amountText);
    if (!Number.isInteger(amount) || amount < 1) {
      window.alert("Antal måste vara ett heltal på minst 1.");
      return;
    }

    void moderateActivity(activity, "APPROVE", amount);
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
      void fetchRecentActivity();
    } catch (error) {
      setSubmitMessage(
        error instanceof Error ? error.message : "Could not add shot",
      );
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
            onClick={() => navigate("/")}
            className="rounded-xl p-3 text-left hover:bg-slate-700"
          >
            Hem
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
          <button
            onClick={() => setMenuOpen(true)}
            className="z-10 rounded-lg p-2 text-2xl hover:bg-slate-800"
          >
            ☰
          </button>

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
          <h2 className="mb-6 text-3xl font-bold text-blue-400">Ge bong</h2>

          {/* Member */}

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
