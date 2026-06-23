import { useState } from "react";
import { useNavigate } from "react-router-dom";
import valhallLogo from "../assets/valhall.jpg";

type Roll = "Ordförande" | "Vice Ordförande";
type HemligStatus = "Gud" | "As";
type Gud = { id: number; gudanamn: string; namn: string; roll: Roll; hemligStatus: HemligStatus; bildUrl?: string };

const roles: Roll[] = ["Ordförande", "Vice Ordförande"];
const statuses: HemligStatus[] = ["Gud", "As"];
const initialGods: Gud[] = [
  { id: 1, gudanamn: "Oden", namn: "Rasmus", roll: "Ordförande", hemligStatus: "Gud" },
  { id: 2, gudanamn: "Tor", namn: "Joel", roll: "Vice Ordförande", hemligStatus: "Gud" },
  { id: 3, gudanamn: "Loke", namn: "Anton", roll: "Vice Ordförande", hemligStatus: "As" },
];

function Gudar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [gods, setGods] = useState(initialGods);
  const [gudanamn, setGudanamn] = useState("");
  const [namn, setNamn] = useState("");
  const [roll, setRoll] = useState<Roll>("Ordförande");
  const [hemligStatus, setHemligStatus] = useState<HemligStatus>("As");
  const [bildUrl, setBildUrl] = useState("");
  const navigate = useNavigate();

  function addGod(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!gudanamn.trim() || !namn.trim()) return;

    setGods((current) => [
      ...current,
      { id: Date.now(), gudanamn: gudanamn.trim(), namn: namn.trim(), roll, hemligStatus, bildUrl: bildUrl || undefined },
    ]);
    setGudanamn("");
    setNamn("");
    setBildUrl("");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-16 text-white">
      {menuOpen && <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setMenuOpen(false)} />}

      <aside className={`fixed top-0 left-0 z-50 h-full w-72 bg-slate-800 shadow-2xl transition-transform duration-300 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="border-b border-slate-700 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 font-bold">R</div>
            <div><p className="font-semibold">Rasmus</p><p className="text-sm text-slate-400">ACTIVE</p></div>
          </div>
        </div>
        <nav className="flex flex-col p-4">
          <button onClick={() => navigate("/")} className="rounded-xl p-3 text-left hover:bg-slate-700">Home</button>
          <button onClick={() => navigate("/add")} className="rounded-xl p-3 text-left hover:bg-slate-700">Add Shot</button>
          <button onClick={() => navigate("/redeem")} className="rounded-xl p-3 text-left hover:bg-slate-700">Redeem Shot</button>
          <button onClick={() => navigate("/leaderboard")} className="rounded-xl p-3 text-left hover:bg-slate-700">Leaderboard</button>
          <button onClick={() => navigate("/notifications")} className="rounded-xl p-3 text-left hover:bg-slate-700">Notifications</button>
          <div className="mt-8 border-t border-slate-700 pt-4">
            <button onClick={() => navigate("/profile")} className="w-full rounded-xl p-3 text-left hover:bg-slate-700">Edit Profile</button>
            <button className="w-full rounded-xl p-3 text-left hover:bg-slate-700">Logout</button>
          </div>
        </nav>
      </aside>

      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="relative flex min-h-[160px] items-start p-4">
          <button onClick={() => setMenuOpen(true)} className="z-10 rounded-lg p-2 font-semibold hover:bg-slate-800" aria-label="Open menu">Menu</button>
          <div className="absolute top-4 left-1/2 flex -translate-x-1/2 flex-col items-center">
            <img src={valhallLogo} alt="Valhall Logo" className="h-24 w-auto object-contain" />
            <h1 className="mt-2 text-3xl font-bold tracking-wider text-blue-500">Valhall</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 pt-12">
        <form onSubmit={addGod} className="rounded-3xl border border-blue-900/30 bg-slate-800/90 p-4 shadow-2xl">
          <h2 className="mb-4 text-2xl font-bold text-blue-400">Lägg till gud</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label><span className="mb-1 block text-sm font-semibold">Gudanamn</span><input value={gudanamn} onChange={(event) => setGudanamn(event.target.value)} className="w-full rounded-xl bg-slate-700 p-3" placeholder="Exempel: Tor" /></label>
            <label><span className="mb-1 block text-sm font-semibold">Namn</span><input value={namn} onChange={(event) => setNamn(event.target.value)} className="w-full rounded-xl bg-slate-700 p-3" placeholder="Personens namn" /></label>
            <label><span className="mb-1 block text-sm font-semibold">Roll</span><select value={roll} onChange={(event) => setRoll(event.target.value as Roll)} className="w-full rounded-xl bg-slate-700 p-3">{roles.map((role) => <option key={role}>{role}</option>)}</select></label>
            <label><span className="mb-1 block text-sm font-semibold">Hemlig status</span><select value={hemligStatus} onChange={(event) => setHemligStatus(event.target.value as HemligStatus)} className="w-full rounded-xl bg-slate-700 p-3">{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
            <label>
              <span className="mb-1 block text-sm font-semibold">Bild</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) setBildUrl(URL.createObjectURL(file));
                }}
                className="w-full rounded-xl bg-slate-700 p-2 text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:font-semibold file:text-white"
              />
            </label>
          </div>
          <button type="submit" className="mt-4 w-full rounded-2xl bg-blue-600 py-3 font-bold hover:bg-blue-700">Lägg till i listan</button>
        </form>

        {statuses.map((status) => (
          <section key={status} className="overflow-x-auto rounded-3xl border border-slate-700 bg-slate-800/90 p-4 shadow-2xl">
            <h2 className="mb-3 text-xl font-bold text-blue-400">{status === "Gud" ? "Gudar" : "Asar"}</h2>
            <table className="w-full min-w-[650px] text-left">
              <thead className="border-b border-slate-600 text-blue-400">
                <tr>
                  <th className="p-3">Gudanamn</th>
                  <th className="p-3">Namn</th>
                  <th className="p-3">Roll</th>
                  <th className="p-3">Bild</th>
                </tr>
              </thead>
              <tbody>
                {gods.filter((god) => god.hemligStatus === status).map((god) => (
                    <tr key={god.id} className="border-b border-slate-700 last:border-0 hover:bg-slate-700/40">
                      <td className="p-3 font-bold">{god.gudanamn}</td>
                      <td className="p-3 text-slate-300">{god.namn}</td>
                      <td className="p-3"><span className="rounded-full bg-slate-700 px-3 py-1.5 text-sm font-semibold">{god.roll}</span></td>
                      <td className="p-3">
                        {god.bildUrl ? (
                          <img src={god.bildUrl} alt={god.gudanamn} className="h-11 w-11 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 font-bold">{god.gudanamn.charAt(0)}</div>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
        ))}
      </main>
    </div>
  );
}

export default Gudar;
