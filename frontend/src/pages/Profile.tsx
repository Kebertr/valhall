
import Navbar from "../components/Navbar";
function Profile() {

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-24 text-white">
      <Navbar />

      <main className="px-4 pt-16">
        <section className="rounded-3xl border border-blue-900/30 bg-slate-800/90 p-6 text-center shadow-2xl">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-blue-500 bg-slate-700 text-5xl shadow-lg">
            R
          </div>

          <p className="mt-6 text-sm font-semibold tracking-widest text-slate-400 uppercase">
            Godname
          </p>
          <h2 className="mt-1 text-3xl font-bold text-blue-400">Odin</h2>

          <button className="mt-8 w-full rounded-2xl bg-blue-600 py-4 text-lg font-bold transition hover:bg-blue-700">
            Change Profile
          </button>
        </section>
      </main>
    </div>
  );
}

export default Profile;
