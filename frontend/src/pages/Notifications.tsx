import Navbar from "../components/Navbar";

function Notifications() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-16 text-white">
      <Navbar />

      <main className="px-4 pt-16">
        <section className="rounded-3xl border border-blue-900/30 bg-slate-800/90 p-6 text-center shadow-2xl">
          <h1 className="text-3xl font-bold text-blue-400">Notiser</h1>
          <p className="mt-4 text-lg text-slate-300">Kommer snart</p>
        </section>
      </main>
    </div>
  );
}

export default Notifications;
