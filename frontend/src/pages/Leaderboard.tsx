import { authFetch } from "../auth/authFetch";
import Navbar from "../components/Navbar";
import { useEffect, useState } from "react";

type LeaderboardEntry = {
  name: string;
  amount: number;
};


function Leaderboard() {
  const [entriesAdd, setEntriesAdd] = useState<LeaderboardEntry[]>([]);
  const [entriesRedeem, setEntriesRedeem] = useState<LeaderboardEntry[]>([]);


  useEffect(() => {
    async function getLeaderboardAdd() {
      const response = await authFetch("http://localhost:3001/api/leaderboard/add");

      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }

      const data = await response.json();
      setEntriesAdd(data);
    };

    async function getLeaderboardRedeem() {
      const response = await authFetch("http://localhost:3001/api/leaderboard/redeem");

      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }

      const data = await response.json();
      setEntriesRedeem(data);
    };

    void getLeaderboardAdd();
    void getLeaderboardRedeem();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-16 text-white">
      <Navbar />

      <main className="grid gap-6 px-4 pt-16 lg:grid-cols-2">
        <section className="rounded-3xl border border-blue-900/30 bg-slate-800/90 p-5 shadow-2xl">
          <h2 className="mb-5 text-2xl font-bold text-blue-400">
            Bongar mottagna
          </h2>
          {entriesAdd.map((entry, index) => (
            <div key={entry.name}>
              #{index + 1} {entry.name}: {entry.amount}
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-blue-900/30 bg-slate-800/90 p-5 shadow-2xl">
          <h2 className="mb-5 text-2xl font-bold text-blue-400">
            Bongar tagna
          </h2>
          {entriesRedeem.map((entry, index) => (
            <div key={entry.name}>
              #{index + 1} {entry.name}: {entry.amount}
            </div>
          ))}
        </section>

        
      </main>
    </div>
  );
}

export default Leaderboard;
