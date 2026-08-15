import { useState } from "react";
import { useNavigate } from "react-router-dom";
import valhallLogo from "../assets/valhall.jpg";
import LogoutButton from "../auth/LogoutButton";
import { hasAnyRole } from "../auth/roles";
import NavbarIdentity from "./NavbarIdentity";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  function goTo(path: string) {
    setMenuOpen(false);
    navigate(path);
  }

  return (
    <>
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60"
          onClick={() => setMenuOpen(false)}
        />
      )}

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
            onClick={() => goTo("/add")}
            className="rounded-xl p-3 text-left hover:bg-slate-700"
          >
            Ge bong
          </button>

          <button
            onClick={() => goTo("/redeem")}
            className="rounded-xl p-3 text-left hover:bg-slate-700"
          >
            Bli av med bong
          </button>

          <button
            onClick={() => goTo("/leaderboard")}
            className="rounded-xl p-3 text-left hover:bg-slate-700"
          >
            Topplista
          </button>

          <button
            onClick={() => goTo("/gudar")}
            className="rounded-xl p-3 text-left hover:bg-slate-700"
          >
            Gudar
          </button>

          {hasAnyRole(["ADMIN", "BONGMEISTER"]) && (
            <button
              onClick={() => goTo("/bongmeister")}
              className="rounded-xl p-3 text-left hover:bg-slate-700"
            >
              Bongmeister
            </button>
          )}

          {hasAnyRole(["ADMIN", "ORDFORANDE"]) && (
            <button
              onClick={() => goTo("/member-links")}
              className="rounded-xl p-3 text-left hover:bg-slate-700"
            >
              Medlemslänkar
            </button>
          )}

          <button
            onClick={() => goTo("/notifications")}
            className="rounded-xl p-3 text-left hover:bg-slate-700"
          >
            Notiser
          </button>

          <div className="mt-8 border-t border-slate-700 pt-4">
            <button
              onClick={() => goTo("/profile")}
              className="w-full rounded-xl p-3 text-left hover:bg-slate-700"
            >
              Redigera profil
            </button>

            <LogoutButton className="w-full rounded-xl p-3 text-left hover:bg-slate-700" />
          </div>
        </nav>
      </div>

      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="relative flex min-h-[160px] items-start p-4">
          <button
            onClick={() => setMenuOpen(true)}
            className="z-10 rounded-lg p-2 text-2xl hover:bg-slate-800"
            aria-label="Öppna meny"
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
    </>
  );
}

export default Navbar;
