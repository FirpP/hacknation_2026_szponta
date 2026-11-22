import { Link } from "react-router-dom";
import HeroArt from "@/components/HeroArt";
import { latestRunBySource, useCards, useRuns, useStats } from "@/features/cards/cards.hooks";
import {
  DOMAIN_LABELS,
  DOMAINS,
  RUN_STATUS,
  SOURCES,
  STATUS_LABELS,
  STATUSES,
  formatDate,
} from "@/features/cards/cards.labels";
import type { Stats } from "@/lib/types/cards.types";

const ICON = { fill: "none", stroke: "#fff", strokeWidth: 1.8, strokeLinecap: "round" } as const;

const STEPS = [
  {
    n: "01",
    title: "Zbieramy",
    who: "Scrapery, co 24 h",
    text: "Robot pobiera rekordy z publicznych serwisów: wyniki projektów NCBR, katalogi, rejestry patentowe. Respektuje robots.txt, robi przerwy między zapytaniami i zapisuje surowy rekord bez zmian.",
    icon: (
      <svg viewBox="0 0 24 24" {...ICON}>
        <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
      </svg>
    ),
  },
  {
    n: "02",
    title: "Analizujemy",
    who: "Model językowy",
    text: "Model AI czyta rekord i wypełnia kartę: nazwę, opis, dziedzinę, poziom wdrożenia, TRL i trzy oceny z uzasadnieniem. Dla każdego faktu musi podać dosłowny cytat ze źródła.",
    icon: (
      <svg viewBox="0 0 24 24" {...ICON}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 12l6-6" />
      </svg>
    ),
  },
  {
    n: "03",
    title: "Sprawdzamy",
    who: "Kod, nie AI",
    text: "Program szuka każdego cytatu w pobranym rekordzie. Pole bez potwierdzonego cytatu traci status „Fakt” i staje się „Szacunkiem”. TRL i oceny są zawsze szacunkiem.",
    icon: (
      <svg viewBox="0 0 24 24" {...ICON}>
        <path d="M4 12l5 5L20 6" />
      </svg>
    ),
  },
  {
    n: "04",
    title: "Przeglądasz",
    who: "PCI, instytucje, firmy",
    text: "Szukasz po słowach, filtrujesz po dziedzinie, statusie, TRL i źródle, porównujesz oceny na radarze. Każda karta prowadzi do oryginalnej strony źródła.",
    icon: (
      <svg viewBox="0 0 24 24" {...ICON}>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="M15.5 15.5L21 21" />
      </svg>
    ),
  },
];

const CRITERIA: { title: string; q: string; tag: string; est?: boolean; scale: string[] }[] = [
  {
    title: "Poziom wdrożenia",
    q: "Na jakim etapie jest rozwiązanie?",
    tag: "fakt lub szacunek",
    scale: ["Koncepcja", "Prototyp", "Testy", "Pilotaż", "Wdrożone"],
  },
  {
    title: "Gotowość (TRL)",
    q: "Jak dojrzała jest technologia? Tylko dla rozwiązań technicznych.",
    tag: "szacunek",
    est: true,
    scale: ["TRL 1–3 badania", "TRL 4–5 walidacja", "TRL 6–7 demonstracja", "TRL 8–9 rynek"],
  },
  {
    title: "Innowacyjność",
    q: "Na ile rozwiązanie różni się od istniejących?",
    tag: "szacunek 1–5",
    est: true,
    scale: ["Drobna zmiana", "Ulepszenie", "Nowe w regionie", "Nowe w kraju i dalej"],
  },
  {
    title: "Potencjał zastosowania",
    q: "Czy da się je użyć w innych instytucjach i branżach?",
    tag: "szacunek 1–5",
    est: true,
    scale: ["Tylko u twórcy", "W kilku miejscach", "W branży", "Szeroko"],
  },
  {
    title: "Wiarygodność",
    q: "Jak mocne są potwierdzenia w źródle?",
    tag: "szacunek 1–5",
    est: true,
    scale: ["Deklaracja", "Opis projektu", "Dokumentacja", "Rejestr / wdrożenie"],
  },
  {
    title: "Innowacja wg Oslo Manual",
    q: "Czy to nowe lub ulepszone rozwiązanie, które udostępniono użytkownikom?",
    tag: "szacunek",
    est: true,
    scale: ["Nie", "Brak danych", "Tak"],
  },
];

const Bars = ({ title, rows }: { title: string; rows: { label: string; value: number }[] }) => {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div>
      <h3>{title}</h3>
      <div className="bars">
        {rows.map((r) => (
          <div key={r.label} className="bar-row">
            <span>{r.label}</span>
            <span className="bar-track">
              <span className="bar-fill" style={{ width: `${(r.value / max) * 85}%` }} />
              <span className="bar-val">{r.value}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatsTiles = ({ stats }: { stats: Stats | undefined }) => {
  const pct =
    stats && stats.evidence.total > 0 ? Math.round((stats.evidence.verified / stats.evidence.total) * 100) : null;
  const v = (x: number | string | null | undefined) => (stats ? (x ?? "–") : "…");
  return (
    <div className="stats" aria-live="polite">
      <div className="stat">
        <b>{v(stats?.totalCards)}</b>
        <span>kart innowacji w bazie</span>
      </div>
      <div className="stat">
        <b>{v(stats?.innovations)}</b>
        <span>spełnia definicję innowacji (szacunek AI)</span>
      </div>
      <div className="stat">
        <b>{v(pct === null ? null : `${pct}%`)}</b>
        <span>cytatów potwierdzonych w źródle</span>
      </div>
      <div className="stat">
        <b style={{ fontSize: 28, paddingTop: 8 }}>{v(formatDate(stats?.lastFetchedAt))}</b>
        <span>ostatnie pobranie danych</span>
      </div>
    </div>
  );
};

const Home = () => {
  const { data: stats } = useStats();
  const { data: runs } = useRuns();
  const { data: top } = useCards({ isInnovation: true, sort: "innovationScore", order: "desc", pageSize: 2 });
  const latest = latestRunBySource(runs);
  const best = top?.items[0];

  return (
    <>
      {/* HERO */}
      <div className="hero">
        <HeroArt labels={top?.items.map((c) => `${c.title} · ${c.scores.innovation.score}/5`)} />
        <div className="wrap hero-in">
          <span className="hero-tag">Radar Innowacji</span>
          <h1 className="hero-title">Istniejące innowacje z publicznych źródeł – w jednym miejscu</h1>
          <p className="hero-sub">
            Robot przegląda publiczne serwisy z wynikami projektów, patentami i katalogami rozwiązań. Model AI opisuje
            każde znalezisko jako kartę innowacji z oceną potencjału. Przy każdym fakcie jest cytat ze źródła, a
            szacunki są wyraźnie oznaczone.
          </p>
          <div className="hero-cta">
            <Link className="btn" to="/radar">
              Przeglądaj karty &gt;
            </Link>
            <Link className="btn white" to="/#kryteria">
              Jak oceniamy &gt;
            </Link>
          </div>
        </div>
      </div>

      {/* CZYM JEST */}
      <section id="o-radarze">
        <div className="wrap intro-grid">
          <div>
            <div className="eyebrow">Czym jest Radar Innowacji?</div>
            <h2 className="sec">Dobre rozwiązania już istnieją. Trzeba je tylko znaleźć</h2>
            <p>
              Wyniki projektów badawczych, wdrożenia uczelni, patenty i nowe metody pracy szkół czy urzędów są
              rozproszone po dziesiątkach serwisów. Najczęściej wie o nich tylko kilka osób, a instytucja obok wymyśla
              to samo od zera.
            </p>
            <p>
              Radar automatycznie zbiera opisy <b>istniejących</b> rozwiązań z publicznych źródeł, porządkuje je w
              jednolite karty i ocenia według jawnych kryteriów: poziomu wdrożenia, gotowości technologicznej (TRL),
              innowacyjności, potencjału zastosowania i wiarygodności.
            </p>
            <p>
              Za innowację uznajemy, zgodnie z Oslo Manual 2018, nowe lub ulepszone rozwiązanie, które udostępniono
              użytkownikom. Radar obejmuje rozwiązania technologiczne, edukacyjne i administracyjne.
            </p>
          </div>
          <StatsTiles stats={stats} />
        </div>
      </section>

      {/* JAK TO DZIAŁA */}
      <section id="jak" className="soft">
        <div className="wrap">
          <div className="eyebrow">Jak to działa</div>
          <h2 className="sec">Od publicznego rekordu do karty innowacji</h2>
          <p className="lead">
            Cztery kroki, ten sam proces dla każdego źródła. Uruchamia się cyklicznie, a zmiana treści w źródle powoduje
            ponowną analizę karty.
          </p>
          <div className="cards">
            {STEPS.map((s) => (
              <article key={s.n} className="card">
                <div className="card-top">
                  <span className="n">{s.n}</span>
                  {s.icon}
                </div>
                <div className="card-body">
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                  <span className="who">{s.who}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* KRYTERIA */}
      <section id="kryteria">
        <div className="wrap">
          <div className="eyebrow">Kryteria oceny</div>
          <h2 className="sec">Przejrzysta ocena zamiast czarnej skrzynki</h2>
          <p className="lead">
            Każda karta odpowiada na te same sześć pytań. Każda ocena ma krótkie uzasadnienie odwołujące się do treści
            źródła.
          </p>
          <div className="crit-grid">
            {CRITERIA.map((c) => (
              <div key={c.title} className="crit">
                <div className="crit-head">
                  <h3>{c.title}</h3>
                  <span className={`weight${c.est ? " est" : ""}`}>{c.tag}</span>
                </div>
                <p className="q">{c.q}</p>
                <div className={`scale${c.scale.length === 5 ? " s5" : c.scale.length === 3 ? " s3" : ""}`}>
                  {c.scale.map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="formula">
            <div className="f">Fakt ≠ Szacunek</div>
            <div className="bands">
              <span>
                <span className="chip chip-fact">Fakt</span> wynika wprost ze źródła i ma zweryfikowany cytat
              </span>
              <span>
                <span className="chip chip-est">Szacunek</span> wnioskowanie modelu AI
              </span>
              <span>TRL i oceny 1–5 są zawsze szacunkiem, chyba że źródło podaje je wprost</span>
            </div>
          </div>
        </div>
      </section>

      {/* ŹRÓDŁA */}
      <section id="zrodla" className="soft">
        <div className="wrap">
          <div className="eyebrow">Źródła danych</div>
          <h2 className="sec">Skąd pochodzą karty</h2>
          <p className="lead">
            Korzystamy tylko z publicznych danych i oficjalnych interfejsów. Gdy serwis zabrania automatycznego
            pobierania albo wymaga klucza, pomijamy go i podajemy powód.
          </p>
          <div className="src-grid">
            {SOURCES.map((s) => {
              const run = latest.get(s.id);
              const status = run ? RUN_STATUS[run.status] : null;
              const cards = stats?.sources.find((x) => x.id === s.id)?.cards ?? 0;
              const active = run?.status === "SUCCESS" || run?.status === "PARTIAL" || cards > 0;
              return (
                <div key={s.id} className={`src${active ? "" : " off"}`}>
                  <h4>{s.name}</h4>
                  <div className="how">{s.how}</div>
                  <p>{s.what}</p>
                  <p style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {status ? (
                      <span className={`badge ${status.tone}`}>{status.label}</span>
                    ) : (
                      <span className="badge off">Nie uruchomiono</span>
                    )}
                    <span className="muted" style={{ fontSize: 13 }}>
                      {cards} {cards === 1 ? "karta" : "kart"}
                      {run ? ` · ${formatDate(run.startedAt)}` : ""}
                    </span>
                  </p>
                  {run?.error && run.status !== "SUCCESS" && <p className="reason">{run.error}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAKTY I SZACUNKI */}
      <section id="fakty" className="split" aria-label="Fakty i szacunki">
        <div className="split-bg" aria-hidden="true" />
        <div className="wrap split-in">
          <div className="split-art">
            <svg viewBox="0 0 1100 480" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              <rect width="1100" height="480" fill="#0b2f4d" />
              <g fontFamily="Lato,sans-serif">
                <g transform="translate(40,60)">
                  <rect width="300" height="150" fill="#fff" opacity=".96" />
                  <rect width="300" height="5" fill="#7ab929" />
                  <text x="20" y="36" fontSize="12" fontWeight="700" fill="#035487">
                    ŹRÓDŁO · strona projektu NCBR
                  </text>
                  <text x="20" y="66" fontSize="16" fill="#001a49">
                    „…jako nowy produkt został
                  </text>
                  <text x="20" y="88" fontSize="16" fill="#001a49">
                    wprowadzony na rynek…”
                  </text>
                  <text x="20" y="124" fontSize="12" fill="#414141">
                    surowy rekord zapisany bez zmian
                  </text>
                </g>
                <path
                  d="M340 135 C 380 135, 380 120, 410 120"
                  stroke="#5fb3e8"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="6 6"
                />
                <path
                  d="M340 160 C 380 160, 380 300, 410 300"
                  stroke="#5fb3e8"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="6 6"
                />
                <g transform="translate(410,60)">
                  <rect width="290" height="110" fill="none" stroke="#fff" strokeWidth="1.5" />
                  <text x="20" y="32" fontSize="12" fontWeight="700" fill="#7ab929">
                    FAKT · cytat potwierdzony ✓
                  </text>
                  <text x="20" y="62" fontSize="17" fontWeight="700" fill="#fff">
                    Poziom wdrożenia: Wdrożone
                  </text>
                  <text x="20" y="86" fontSize="13" fill="#ffffff" opacity=".7">
                    cytat znaleziony w rekordzie
                  </text>
                </g>
                <g transform="translate(410,250)">
                  <rect width="290" height="110" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="5 4" />
                  <text x="20" y="32" fontSize="12" fontWeight="700" fill="#5fb3e8">
                    SZACUNEK · model AI
                  </text>
                  <text x="20" y="62" fontSize="17" fontWeight="700" fill="#fff">
                    TRL 9 · Innowacyjność 4/5
                  </text>
                  <text x="20" y="86" fontSize="13" fill="#ffffff" opacity=".7">
                    z uzasadnieniem, bez cytatu
                  </text>
                </g>
              </g>
            </svg>
            <div className="split-panel">
              <small>Odróżniamy fakty od szacunków</small>
              <h3>Każde zdanie ma źródło</h3>
              <p>
                Model AI musi przytoczyć dosłowny fragment źródła dla każdego faktu na karcie. Program sprawdza, czy ten
                fragment naprawdę tam jest. Jeśli nie, pole jest oznaczane jako szacunek.
              </p>
              <Link className="btn ghost" to={best ? `/karty/${best.id}` : "/radar"}>
                Zobacz przykładową kartę &gt;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ROZKŁAD BAZY */}
      <section id="baza">
        <div className="wrap">
          <div className="eyebrow">Co jest w bazie</div>
          <h2 className="sec">Rozkład kart</h2>
          <p className="lead">Liczby z bieżącego stanu bazy, aktualizowane po każdym przebiegu robota.</p>
          {stats ? (
            <div className="dist">
              <Bars
                title="Według dziedziny"
                rows={DOMAINS.map((d) => ({ label: DOMAIN_LABELS[d], value: stats.byDomain[d] }))}
              />
              <Bars
                title="Według poziomu wdrożenia"
                rows={STATUSES.map((s) => ({ label: STATUS_LABELS[s], value: stats.byStatus[s] }))}
              />
            </div>
          ) : (
            <p className="muted" style={{ marginTop: 24 }}>
              Wczytywanie…
            </p>
          )}
        </div>
      </section>

      {/* DLA KOGO */}
      <section id="dla-kogo" className="soft">
        <div className="wrap">
          <div className="eyebrow">Dla kogo</div>
          <h2 className="sec">Jedna baza, trzy grupy odbiorców</h2>
          <div className="aud">
            <article className="card">
              <div className="card-top">
                <strong style={{ fontSize: 19 }}>Analitycy PCI</strong>
              </div>
              <div className="card-body">
                <p>Zespół, który śledzi innowacje w regionie i szuka rozwiązań wartych promocji lub wsparcia.</p>
                <ul>
                  <li>Jedno miejsce zamiast wielu serwisów</li>
                  <li>Ocena potencjału z uzasadnieniem</li>
                  <li>Cytaty i link do źródła przy każdej karcie</li>
                  <li>Baza odświeżana automatycznie</li>
                </ul>
              </div>
            </article>
            <article className="card">
              <div className="card-top">
                <strong style={{ fontSize: 19 }}>Instytucje szukające rozwiązań</strong>
              </div>
              <div className="card-body">
                <p>Gminy, szkoły i urzędy, które mają problem do rozwiązania i nie chcą zaczynać od zera.</p>
                <ul>
                  <li>Wyszukiwarka i filtry po dziedzinie i statusie</li>
                  <li>Rozwiązania już wdrożone w innych miejscach</li>
                  <li>Ocena potencjału użycia u siebie</li>
                  <li>Kontakt do twórcy przez stronę źródła</li>
                </ul>
              </div>
            </article>
            <article className="card">
              <div className="card-top">
                <strong style={{ fontSize: 19 }}>Firmy i inwestorzy</strong>
              </div>
              <div className="card-body">
                <p>Partnerzy, którzy chcą wdrażać lub rozwijać technologie z polskich uczelni i instytutów.</p>
                <ul>
                  <li>Filtrowanie po TRL i poziomie wdrożenia</li>
                  <li>Porównanie ocen na radarze</li>
                  <li>Wyniki projektów NCBR i patenty w jednym widoku</li>
                  <li>Jasne oznaczenie, co jest faktem, a co szacunkiem</li>
                </ul>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* PRZEJRZYSTOŚĆ */}
      <section id="przejrzystosc">
        <div className="wrap">
          <div className="eyebrow">Przejrzystość i ochrona danych</div>
          <h2 className="sec">Co pokazujemy, a czego nie</h2>
          <p className="lead">
            Publikujemy tylko to, co pomaga znaleźć rozwiązanie, i zawsze wskazujemy, skąd pochodzi informacja.
          </p>
          <div className="data-grid">
            <div className="dcol">
              <h4>Pokazujemy</h4>
              <div className="who">na każdej karcie</div>
              <ul>
                <li>Nazwę, opis i obszar zastosowania</li>
                <li>Dziedzinę i poziom wdrożenia</li>
                <li>Cytaty ze źródła z wynikiem weryfikacji</li>
                <li>Link do oryginalnej strony</li>
                <li>Datę pobrania i wersję analizy</li>
              </ul>
            </div>
            <div className="dcol est">
              <h4>Oznaczamy jako szacunek</h4>
              <div className="who">wnioskowanie modelu AI</div>
              <ul>
                <li>TRL</li>
                <li>Innowacyjność, potencjał, wiarygodność</li>
                <li>Czy to innowacja wg Oslo Manual</li>
                <li>Pola bez potwierdzonego cytatu</li>
              </ul>
            </div>
            <div className="dcol lock">
              <h4>Nie publikujemy</h4>
              <div className="who">zostaje w bazie lub nie jest zbierane</div>
              <ul>
                <li>Pełnego surowego rekordu</li>
                <li>Danych z serwisów, które zabraniają pobierania</li>
                <li>Danych logowania ani zgłoszeń użytkowników</li>
                <li>Informacji spoza publicznego źródła</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="cta">
        <div className="wrap cta-in">
          <div>
            <h2>Szukasz rozwiązania, które już działa?</h2>
            <p>
              Przejrzyj karty innowacji z publicznych źródeł. Zawęź je do swojej dziedziny i sprawdź, co zostało już
              wdrożone.
            </p>
          </div>
          <div className="row">
            <Link className="btn white" to="/radar">
              Przeglądaj karty &gt;
            </Link>
            <Link className="btn outline-w" to="/radar?view=radar">
              Widok radaru
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
