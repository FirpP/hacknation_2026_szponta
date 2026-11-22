import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import RadarLogo from "@/components/RadarLogo";

const Brand = () => (
  <Link className="brand" to="/" aria-label="Radar Innowacji – strona główna">
    <RadarLogo />
    <span className="brand-name">Radar</span>
    <span className="brand-sub">
      Innowacje z publicznych
      <br />
      źródeł w jednym miejscu
    </span>
  </Link>
);

/** BrowserRouter nie przewija do #kotwicy ani na górę po zmianie strony, więc robimy to sami */
const useScrollOnNavigate = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
};

const MainLayout = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useScrollOnNavigate();

  // Zamknij menu mobilne po przejściu w inne miejsce
  const [lastKey, setLastKey] = useState(location.key);
  if (lastKey !== location.key) {
    setLastKey(location.key);
    setOpen(false);
  }

  return (
    <>
      <header className="site">
        <div className="wrap hdr">
          <Brand />
          <button
            className="burger"
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="nav"
            onClick={() => setOpen((v) => !v)}
          >
            ☰
          </button>
          <nav className={`main${open ? " open" : ""}`} id="nav" aria-label="Nawigacja główna">
            <Link to="/#jak">Jak to działa</Link>
            <Link to="/#kryteria">Kryteria</Link>
            <Link to="/#zrodla">Źródła</Link>
            <NavLink to="/radar" end>
              Przeglądaj
            </NavLink>
            <Link className="btn sm" to="/radar?view=radar">
              Radar &gt;
            </Link>
          </nav>
        </div>
      </header>

      <main id="top">
        <Outlet />
      </main>

      <footer className="site">
        <div className="wrap">
          <div className="ft-top">
            <div>
              <Brand />
              <p className="ft-note">
                Prototyp przygotowany w ramach wyzwania „Radar innowacji” Podkarpackiego Centrum Innowacji (HackNation
                2026). Karty powstają automatycznie z publicznych źródeł; oceny i TRL to szacunki modelu AI.
              </p>
            </div>
            <div>
              <h5>Radar</h5>
              <div className="ft-links">
                <Link to="/radar">Wszystkie karty</Link>
                <Link to="/radar?view=radar">Widok radaru</Link>
                <Link to="/radar?domain=TECHNOLOGICAL">Technologiczne</Link>
                <Link to="/radar?domain=EDUCATIONAL">Edukacyjne</Link>
                <Link to="/radar?domain=ADMINISTRATIVE">Administracyjne</Link>
                <Link to="/radar?status=IN_USE">Wdrożone</Link>
              </div>
            </div>
            <div>
              <h5>Na stronie głównej</h5>
              <div className="ft-links">
                <Link to="/#jak">Jak to działa</Link>
                <Link to="/#kryteria">Kryteria</Link>
                <Link to="/#zrodla">Źródła danych</Link>
                <Link to="/#fakty">Fakty i szacunki</Link>
                <Link to="/#dla-kogo">Dla kogo</Link>
                <Link to="/#przejrzystosc">Przejrzystość</Link>
              </div>
            </div>
          </div>
          <div className="ft-bottom">
            <span>Radar Innowacji · projekt konkursowy · 2026</span>
            <span>
              <Link to="/#przejrzystosc">Przejrzystość danych</Link> &nbsp;·&nbsp;{" "}
              <Link to="/#kryteria">Zasady oceny</Link>
            </span>
          </div>
        </div>
      </footer>
    </>
  );
};

export default MainLayout;
