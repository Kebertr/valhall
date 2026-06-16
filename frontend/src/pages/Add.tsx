import { useState } from "react";
import valhallLogo from "../assets/valhall.jpg";
import "../App.css";

function AddShot() {
  const members = [ "Anton", "Anna", "Antonia", "Andreas", "Joel", "Filip", "Rasmus", ]; const [search, setSearch] = useState(""); const [selectedMember, setSelectedMember] = useState(""); const filteredMembers = members.filter(member => member.toLowerCase().includes(search.toLowerCase()) );
  const [menuOpen, setMenuOpen] = useState(false);
  const [amount, setAmount] = useState(1);

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
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 font-bold">
              R
            </div>

            <div>
              <p className="font-semibold">Rasmus</p>
              <p className="text-sm text-slate-400">ACTIVE</p>
            </div>
          </div>
        </div>

        <nav className="flex flex-col p-4">
          <button className="rounded-xl p-3 text-left hover:bg-slate-700">
            Home
          </button>

          <button className="rounded-xl p-3 text-left hover:bg-slate-700">
            Redeem Shot
          </button>

          <button className="rounded-xl p-3 text-left hover:bg-slate-700">
            Leaderboard
          </button>

          <button className="rounded-xl p-3 text-left hover:bg-slate-700">
            Notifications
          </button>

          <div className="mt-8 border-t border-slate-700 pt-4">
            <button className="w-full rounded-xl p-3 text-left hover:bg-slate-700">
              Edit Profile
            </button>

            <button className="w-full rounded-xl p-3 text-left hover:bg-slate-700">
              Logout
            </button>
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
          <h2 className="mb-6 text-3xl font-bold text-blue-400">
            Add Shot
          </h2>

          {/* Member */}

        <div className="mb-5">
        <label className="mb-2 block text-lg font-semibold">
            Member
        </label>

        <input
            type="text"
            placeholder="Search member..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3 w-full rounded-xl bg-slate-700 p-4 text-white"
        />

        {selectedMember && (
            <div className="mb-3 rounded-xl border border-green-500 bg-green-900/20 p-3">
            Selected: {selectedMember}
            </div>
        )}

        <div className="max-h-48 overflow-y-auto space-y-2">
            {filteredMembers.map((member) => (
            <button
                key={member}
                onClick={() => setSelectedMember(member)}
                className="
                w-full
                rounded-xl
                bg-slate-700
                p-3
                text-left
                transition
                hover:bg-slate-600
                "
            >
                {member}
            </button>
            ))}
        </div>
        </div>

        
        {/* Amount */} 
        <div className="mb-5"> 
            <label className="mb-2 block text-lg font-semibold"> 
                Amount 
            </label> 
            <input  type="number" min="1" enterKeyHint="done" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className=" w-full rounded-xl bg-slate-700 p-4 text-white text-lg " /> 
        </div>


          {/* Reason */}
          <div className="mb-5">
            <label className="mb-2 block text-lg font-semibold">
              Reason
            </label>

            <textarea
              placeholder="Reason..."
              className="min-h-[120px] w-full rounded-xl bg-slate-700 p-4 text-white"
            />
          </div>

          <button
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
            "
          >
            🍺 Add Shot
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
        <button
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
          ⚔️ Redeem Shot
        </button>
      </div>
    </div>
  );
}

export default AddShot;
