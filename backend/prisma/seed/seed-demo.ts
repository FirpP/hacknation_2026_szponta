/**
 * db:seed-demo: przykładowe karty, żeby prezentacja działała bez internetu i bez klucza LLM.
 *
 * - RawRecord pochodzą z PRAWDZIWYCH odpowiedzi źródeł (fixture'y w src/scrapers/__fixtures__), parsowanych tymi samymi parserami.
 * - Karty są przygotowane ręcznie (model "seed-demo") i przechodzą przez tę samą normalizację co odpowiedzi LLM:
 *   weryfikacja cytatów w surowym rekordzie i wymuszenie ESTIMATED dla ocen, TRL i pól bez potwierdzonego cytatu.
 * - Idempotentny: upsert po (source, externalId) i po rawRecordId.
 *
 * Przypadki użycia na demo: technologiczny (czujnik światłowodowy NCBR, patent PPM) i edukacyjny (program UWr NCBR),
 * plus rekordy odrzucone jako nie-innowacje (szkolenie kadr, katalog stron), żeby pokazać filtr Oslo Manual.
 */
import prisma from "../../src/prisma-client";
import { RADAR_CONFIG } from "../../src/radar.config";
import { readFixture } from "../../src/scrapers/_shared/http";
import { oaiRecordsToItems, parseOaiPage } from "../../src/scrapers/_shared/oai-pmh";
import { sha256 } from "../../src/scrapers/_shared/persist";
import type { RawItem } from "../../src/scrapers/_shared/types";
import { parseNcbr } from "../../src/scrapers/ncbr";
import { parseBaztolResults } from "../../src/scrapers/baztol";
import { LlmCardSchema, type LlmCard } from "../../src/analysis/card.schema";
import { normalizeCard } from "../../src/analysis/evidence";
import { sourceDisplayName } from "../../src/analysis/analyze";

const SEED_MODEL = "seed-demo";
const SEED_PROMPT_VERSION = "seed-v1";

type SeedEntry = { source: "ncbr" | "ppm" | "baztol"; externalId: string; card: unknown };

const SEED: SeedEntry[] = [
  {
    source: "ncbr",
    externalId: "innowacyjny-czujnik-odksztalcen-na-bazie-specjalnych-swiatlowodow-mikrostrukturalnych",
    card: {
      title: "Innowacyjny czujnik odkształceń na bazie specjalnych światłowodów mikrostrukturalnych",
      description:
        "Projekt badawczy Polskiego Centrum Fotoniki i Światłowodów sfinansowany w konkursie LIDER VI (NCBR) i realizowany w latach 2016–2019. Dotyczy czujnika odkształceń wykorzystującego specjalne światłowody mikrostrukturalne. Wartość projektu to 1 186 431,74 zł, w całości dofinansowana. Źródło nie podaje informacji o wdrożeniu.",
      applicationArea: "Inżynieria materiałowa, pomiar odkształceń",
      domain: "TECHNOLOGICAL",
      isInnovation: true,
      isInnovationRationale:
        "Nowe rozwiązanie techniczne (czujnik na światłowodach mikrostrukturalnych), choć bez potwierdzenia wdrożenia.",
      implementationStatus: "PROTOTYPE",
      trl: 4,
      innovation: {
        score: 4,
        rationale:
          "Czujnik oparty na specjalnych światłowodach mikrostrukturalnych to niszowa, nowa technologia pomiarowa.",
      },
      applicationPotential: {
        score: 4,
        rationale: "Pomiar odkształceń przydaje się w monitoringu konstrukcji, energetyce i przemyśle.",
      },
      credibility: {
        score: 3,
        rationale: "Oficjalna strona NCBR, ale to katalog sukcesów bez dokumentacji wyników i wdrożenia.",
      },
      evidence: [
        {
          field: "title",
          quote: "Innowacyjny czujnik odkształceń na bazie specjalnych światłowodów mikrostrukturalnych",
        },
        { field: "description", quote: "Marek Adam Napierała, Polskie Centrum Fotoniki i Światłowodów" },
        { field: "description", quote: "Konkurs LIDER VI" },
        { field: "description", quote: "od 01.02.2016 r. do 31.01.2019 r." },
        { field: "applicationArea", quote: "Słowa Kluczowe: Inżynieria materiałowa" },
      ],
      fieldBasis: {
        title: "CONFIRMED",
        description: "CONFIRMED",
        applicationArea: "CONFIRMED",
        domain: "ESTIMATED",
        implementationStatus: "ESTIMATED",
      },
    },
  },
  {
    source: "ncbr",
    externalId:
      "opracowanie-i-implementacja-nowych-metod-lokalizacji-budowy-mapy-oraz-planowania-ruchu-z-uzyciem-czujnikow-rgb-d-w-zrobotyzowanych-systemach-elastycznej-produkcji",
    card: {
      title: "Metody lokalizacji, budowy mapy i planowania ruchu z czujnikami RGB-D dla zrobotyzowanej produkcji",
      description:
        "Projekt Politechniki Poznańskiej z konkursu Lider VIII (NCBR), realizowany od 2018 do połowy 2021 roku. Obejmuje opracowanie i implementację nowych metod lokalizacji, budowy mapy oraz planowania ruchu z użyciem czujników RGB-D w zrobotyzowanych systemach elastycznej produkcji.",
      applicationArea: "Robotyka przemysłowa, elastyczne systemy produkcyjne",
      domain: "TECHNOLOGICAL",
      isInnovation: true,
      isInnovationRationale:
        "Nowe metody nawigacji robotów z implementacją, czyli potencjalnie nowy proces produkcyjny.",
      implementationStatus: "PROTOTYPE",
      trl: 4,
      innovation: {
        score: 3,
        rationale:
          "Lokalizacja i mapowanie z RGB-D to znany kierunek; nowość dotyczy zastosowania w elastycznej produkcji.",
      },
      applicationPotential: {
        score: 4,
        rationale: "Metody nawigacji robotów mobilnych można przenieść do wielu zakładów i magazynów.",
      },
      credibility: {
        score: 3,
        rationale: "Oficjalne źródło NCBR, ale bez wyników i potwierdzeń wdrożenia u partnera przemysłowego.",
      },
      evidence: [
        {
          field: "title",
          quote: "nowych metod lokalizacji, budowy mapy oraz planowania ruchu z użyciem czujników RGB-D",
        },
        { field: "applicationArea", quote: "w zrobotyzowanych systemach elastycznej produkcji" },
        { field: "description", quote: "Politechnika Poznańska" },
        { field: "description", quote: "Lider VIII" },
        { field: "implementationStatus", quote: "Opracowanie i implementacja nowych metod" },
      ],
      fieldBasis: {
        title: "CONFIRMED",
        description: "CONFIRMED",
        applicationArea: "CONFIRMED",
        domain: "ESTIMATED",
        implementationStatus: "ESTIMATED",
      },
    },
  },
  {
    source: "ncbr",
    externalId:
      "swiat-odkrywcow-odkrywanie-swiata--nowatorski-program-rozwoju-kompetencji-i-pobudzenia-aktywnosci-edukacyjnej-i-kulturalnej-dla-dzieci-szkol-podstawowych",
    card: {
      title: "Świat odkrywców, odkrywanie świata: program edukacyjny Uniwersytetu Wrocławskiego dla szkół podstawowych",
      description:
        "Program rozwoju kompetencji i pobudzania aktywności edukacyjnej i kulturalnej dzieci ze szkół podstawowych, prowadzony przez Uniwersytet Wrocławski w ramach konkursu „Trzecia Misja Uczelni” (POWER). Realizacja trwała od grudnia 2018 do października 2021 roku. Źródło określa program jako nowatorski, ale nie opisuje metody.",
      applicationArea: "Edukacja wczesnoszkolna, współpraca uczelni ze szkołami",
      domain: "EDUCATIONAL",
      isInnovation: true,
      isInnovationRationale:
        "Program edukacyjny wdrożony w praktyce i deklarowany jako nowatorski; stopień nowości nie jest udokumentowany.",
      implementationStatus: "PILOT",
      trl: null,
      innovation: { score: 2, rationale: "Nowatorskość jest tylko deklarowana w tytule, bez opisu metody." },
      applicationPotential: {
        score: 4,
        rationale: "Program uczelnia–szkoła można powtórzyć w innych miastach i uczelniach.",
      },
      credibility: { score: 3, rationale: "Oficjalne źródło NCBR, opis skrótowy, brak materiałów i rezultatów." },
      evidence: [
        { field: "title", quote: "Świat odkrywców, odkrywanie świata – nowatorski program rozwoju kompetencji" },
        { field: "applicationArea", quote: "dla dzieci szkół podstawowych" },
        { field: "description", quote: "Uniwersytet Wrocławski" },
        { field: "description", quote: "Trzecia Misja Uczelni" },
        { field: "implementationStatus", quote: "od 1 grudnia 2018r. do 31 października 2021r." },
        { field: "domain", quote: "Słowa Kluczowe: Pedagogika" },
      ],
      fieldBasis: {
        title: "CONFIRMED",
        description: "CONFIRMED",
        applicationArea: "CONFIRMED",
        domain: "CONFIRMED",
        implementationStatus: "ESTIMATED",
      },
    },
  },
  {
    source: "ncbr",
    externalId: "kadra-jako-kluczowy-element-rozwoju-branzy-motoryzacyjnej",
    card: {
      title: "Kadra jako kluczowy element rozwoju branży motoryzacyjnej",
      description:
        "Projekt PWSZ im. Witelona w Legnicy w programie POWER, wspierający rozwój kadr dla przemysłu motoryzacyjnego, realizowany w latach 2018–2021. Rekord opisuje działanie szkoleniowe, bez nowej metody czy produktu.",
      applicationArea: "Kształcenie kadr dla przemysłu motoryzacyjnego",
      domain: "EDUCATIONAL",
      isInnovation: false,
      isInnovationRationale:
        "Szkolenie i rozwój kadr bez opisu nowej metody nie spełnia definicji innowacji z Oslo Manual.",
      implementationStatus: "UNKNOWN",
      trl: null,
      innovation: { score: 1, rationale: "Brak informacji o nowym lub ulepszonym rozwiązaniu." },
      applicationPotential: {
        score: 2,
        rationale: "Model współpracy uczelni z branżą da się powtórzyć, ale nie jest opisany.",
      },
      credibility: { score: 3, rationale: "Oficjalne źródło NCBR, opis skrótowy." },
      evidence: [
        { field: "title", quote: "Kadra jako kluczowy element rozwoju branży motoryzacyjnej" },
        { field: "applicationArea", quote: "projekt wspierający rozwój kadr dla przemysłu motoryzacyjnego" },
        { field: "description", quote: "Państwowa Wyższa Szkoła Zawodowa im. Witelona w Legnicy" },
      ],
      fieldBasis: {
        title: "CONFIRMED",
        description: "CONFIRMED",
        applicationArea: "CONFIRMED",
        domain: "ESTIMATED",
        implementationStatus: "ESTIMATED",
      },
    },
  },
  {
    source: "ppm",
    externalId: "oai:ppm.edu.pl:Patents/UMWb07a6feda30347c08a9acd22e5db6ef1",
    card: {
      title: "Prolek: glikokoniugat pochodny gemcytabiny o działaniu przeciwnowotworowym",
      description:
        "Patent nr 249385 na nowy związek: glikokoniugat pochodny gemcytabiny (prolek) o działaniu przeciwnowotworowym, wraz ze sposobem otrzymywania i zastosowaniem. Zgłoszenie z 23.11.2022, patent udzielony 19.01.2026. Właściciele są podani tylko jako identyfikatory jednostek (prefiksy UMW i WUT, prawdopodobnie Uniwersytet Medyczny we Wrocławiu i Politechnika Warszawska).",
      applicationArea: "Onkologia, nowe substancje lecznicze",
      domain: "TECHNOLOGICAL",
      isInnovation: null,
      isInnovationRationale:
        "Wynalazek objęty patentem, ale bez potwierdzenia udostępnienia lub wdrożenia (wymóg Oslo Manual).",
      implementationStatus: "CONCEPT",
      trl: 3,
      innovation: {
        score: 4,
        rationale: "Udzielony patent oznacza nowość potwierdzoną badaniem zdolności patentowej przez UPRP.",
      },
      applicationPotential: {
        score: 3,
        rationale:
          "Potencjał licencyjny dla firm farmaceutycznych, ale droga do leku jest długa (badania przedkliniczne i kliniczne).",
      },
      credibility: {
        score: 4,
        rationale: "Dane z rejestru publikacji uczelni z numerem patentu i datami z biuletynu UPRP.",
      },
      evidence: [
        {
          field: "title",
          quote: "Prolek - glikokoniugat pochodny gemcytabiny, jako związek o działaniu przeciwnowotworowym",
        },
        { field: "description", quote: "Pat.249385" },
        { field: "description", quote: "2022-11-23" },
        { field: "description", quote: "2026-01-19" },
        { field: "applicationArea", quote: "jako związek o działaniu przeciwnowotworowym" },
      ],
      // Współwłaściciele w opisie wynikają z prefiksów identyfikatorów (UMW, WUT), więc opis zostaje ESTIMATED
      fieldBasis: {
        title: "CONFIRMED",
        description: "ESTIMATED",
        applicationArea: "CONFIRMED",
        domain: "ESTIMATED",
        implementationStatus: "ESTIMATED",
      },
    },
  },
  {
    source: "baztol",
    externalId: "530",
    card: {
      title: "KoNaR Koło Naukowe Robotyków (Politechnika Wrocławska)",
      description:
        "Strona koła naukowego robotyków działającego pod patronatem Zakładu Podstaw Cybernetyki i Robotyki Politechniki Wrocławskiej. Skierowana do studentów automatyki i robotyki. To zasób informacyjny, a nie opis konkretnego rozwiązania.",
      applicationArea: "Edukacja akademicka, robotyka",
      domain: "EDUCATIONAL",
      isInnovation: false,
      isInnovationRationale: "Rekord opisuje stronę koła naukowego, nie nowe rozwiązanie.",
      implementationStatus: "UNKNOWN",
      trl: null,
      innovation: { score: 1, rationale: "Brak opisu nowego rozwiązania." },
      applicationPotential: { score: 2, rationale: "Może być punktem kontaktu do projektów studenckich z robotyki." },
      credibility: { score: 2, rationale: "Katalog linków z krótkim opisem, bez dat i dokumentacji." },
      evidence: [
        { field: "title", quote: "KoNaR Koło Naukowe Robotyków" },
        {
          field: "description",
          quote: "działającego pod patronatem Zakładu Podstaw Cybernetyki i Robotyki Politechniki Wrocławskiej",
        },
        { field: "applicationArea", quote: "Strona skierowana jest do studentów kierunku automatyka i robotyka" },
      ],
      fieldBasis: {
        title: "CONFIRMED",
        description: "CONFIRMED",
        applicationArea: "CONFIRMED",
        domain: "ESTIMATED",
        implementationStatus: "ESTIMATED",
      },
    },
  },
];

const loadFixtureItems = async (): Promise<Map<string, RawItem>> => {
  const ppm = RADAR_CONFIG.sources.ppm;
  const items: [string, RawItem[]][] = [
    ["ncbr", parseNcbr(await readFixture("ncbr.html"))],
    [
      "ppm",
      oaiRecordsToItems(parseOaiPage(await readFixture("ppm-patents.xml")).records, {
        baseUrl: ppm.url,
        metadataPrefix: ppm.oai.metadataPrefix,
      }),
    ],
    ["baztol", parseBaztolResults(await readFixture("baztol-search.html"))],
  ];
  return new Map(
    items.flatMap(([source, list]) => list.map((item) => [`${source}|${item.externalId}`, item] as const)),
  );
};

const main = async () => {
  const fixtures = await loadFixtureItems();
  const run = await prisma.scrapeRun.create({
    data: { source: "seed-demo", status: "SUCCESS", finishedAt: new Date(), itemsFetched: SEED.length },
  });

  for (const entry of SEED) {
    const item = fixtures.get(`${entry.source}|${entry.externalId}`);
    if (!item) throw new Error(`Brak rekordu ${entry.source}/${entry.externalId} w fixture'ach`);
    const contentHash = sha256(item.payload);

    const record = await prisma.rawRecord.upsert({
      where: { source_externalId: { source: entry.source, externalId: entry.externalId } },
      create: {
        source: entry.source,
        externalId: entry.externalId,
        url: item.url,
        payloadType: item.payloadType,
        rawPayload: item.payload,
        contentHash,
        runId: run.id,
        analysisStatus: "DONE",
      },
      update: {
        url: item.url,
        payloadType: item.payloadType,
        rawPayload: item.payload,
        contentHash,
        analysisStatus: "DONE",
        analysisError: null,
        failedHash: null,
      },
    });

    const llmCard: LlmCard = LlmCardSchema.parse(entry.card);
    const card = normalizeCard(llmCard, item.payload, item.payloadType);
    const data = {
      rawContentHash: contentHash,
      title: card.title,
      description: card.description,
      applicationArea: card.applicationArea,
      domain: card.domain,
      isInnovation: card.isInnovation,
      isInnovationRationale: card.isInnovationRationale,
      sourceUrl: item.url,
      sourceName: sourceDisplayName(entry.source),
      implementationStatus: card.implementationStatus,
      trl: card.trl,
      innovationScore: card.innovation.score,
      innovationRationale: card.innovation.rationale,
      applicationPotentialScore: card.applicationPotential.score,
      applicationPotentialRationale: card.applicationPotential.rationale,
      credibilityScore: card.credibility.score,
      credibilityRationale: card.credibility.rationale,
      evidence: card.evidence,
      fieldBasis: card.fieldBasis,
      analyzedAt: new Date(),
      model: SEED_MODEL,
      promptVersion: SEED_PROMPT_VERSION,
    };
    await prisma.innovationCard.upsert({
      where: { rawRecordId: record.id },
      create: { rawRecordId: record.id, ...data },
      update: data,
    });

    const unverified = card.evidence.filter((e) => !e.verified);
    console.log(
      `✔ [${entry.source}] ${card.title.slice(0, 70)} | cytaty ${card.evidence.length - unverified.length}/${card.evidence.length}` +
        (unverified.length ? ` | NIEZWERYFIKOWANE: ${unverified.map((e) => `"${e.quote}"`).join(", ")}` : ""),
    );
  }
};

main()
  .then(async () => {
    console.log(`Seed demo: ${SEED.length} kart gotowych (GET /api/v1/cards).`);
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("✖ Seed demo nie powiódł się:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
