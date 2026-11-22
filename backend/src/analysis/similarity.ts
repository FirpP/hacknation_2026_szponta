/**
 * Podobne karty i możliwe duplikaty: TF-IDF na słowach z tytułu (waga ×2), opisu i obszaru zastosowania
 * oraz podobieństwo cosinusowe. Bez embeddingów i zewnętrznych usług, więc wynik jest powtarzalny.
 * Polska fleksja jest przybliżana obcięciem słowa do STEM_LENGTH znaków (uczelnią/uczelnia -> uczeln).
 */

export type SimilarityDoc = { id: number; title: string; description: string; applicationArea: string | null };
export type SimilarHit = { id: number; score: number; titleScore: number; possibleDuplicate: boolean };

/**
 * Możliwy duplikat: bardzo podobna całość albo prawie identyczny tytuł.
 * Progi dobrane na bazie z 2026-11-22: pary z tym samym tytułem miały 0.74-0.82 całości,
 * a różne projekty o podobnych nazwach (np. „Akademia 360” / „Akademia 4.0”) miały tytuły ok. 0.88.
 */
export const DUPLICATE_THRESHOLD = 0.7;
export const DUPLICATE_TITLE_THRESHOLD = 0.9;
/** Krótkie tytuły („Elektroonline.pl” / „Elektrosystemy” -> „elektr”) dawały fałszywe zgodności */
const MIN_TITLE_TOKENS_FOR_DUPLICATE = 3;
const MIN_SCORE = 0.1;
const STEM_LENGTH = 6;
const TITLE_WEIGHT = 2;

// Krótka lista słów, które nic nie mówią o treści (po usunięciu polskich znaków i obcięciu)
const STOPWORDS = new Set(
  [
    "oraz",
    "przez",
    "jest",
    "dla",
    "jako",
    "ktore",
    "ktory",
    "ktora",
    "tego",
    "tym",
    "sie",
    "jego",
    "ich",
    "ten",
    "the",
    "and",
    "for",
    "with",
    "projekt",
    "projektu",
    "rozwiazanie",
    "rozwiazania",
    "ramach",
    "bardzo",
    "moze",
    "wraz",
    "takze",
    "rowniez",
    "jednak",
  ].map((w) => w.slice(0, STEM_LENGTH)),
);

export const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replaceAll("ł", "l") // NFD nie rozkłada "ł"
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3)
    .map((t) => t.slice(0, STEM_LENGTH))
    .filter((t) => !STOPWORDS.has(t));

type Vector = Map<string, number>;

const countTerms = (parts: [tokens: string[], weight: number][]): Vector => {
  const counts: Vector = new Map();
  for (const [tokens, weight] of parts) for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + weight);
  return counts;
};

/** Wektory TF-IDF znormalizowane do długości 1 (iloczyn skalarny = cosinus) */
const tfidf = (counts: Map<number, Vector>): Map<number, Vector> => {
  const df = new Map<string, number>();
  for (const c of counts.values()) for (const term of c.keys()) df.set(term, (df.get(term) ?? 0) + 1);

  const n = counts.size;
  const vectors = new Map<number, Vector>();
  for (const [id, c] of counts) {
    const vector: Vector = new Map();
    let norm = 0;
    for (const [term, tf] of c) {
      const weight = tf * (Math.log((n + 1) / (df.get(term)! + 1)) + 1);
      vector.set(term, weight);
      norm += weight * weight;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [term, weight] of vector) vector.set(term, weight / norm);
    vectors.set(id, vector);
  }
  return vectors;
};

const cosine = (va: Vector | undefined, vb: Vector | undefined): number => {
  if (!va || !vb) return 0;
  const [small, large] = va.size <= vb.size ? [va, vb] : [vb, va];
  let dot = 0;
  for (const [term, weight] of small) dot += weight * (large.get(term) ?? 0);
  return dot;
};

export class SimilarityIndex {
  private readonly full: Map<number, Vector>;
  private readonly titles: Map<number, Vector>;
  private readonly titleLength = new Map<number, number>();

  constructor(docs: SimilarityDoc[]) {
    const tokens = docs.map((d) => ({
      id: d.id,
      title: tokenize(d.title),
      rest: [...tokenize(d.description), ...tokenize(d.applicationArea ?? "")],
    }));
    this.full = tfidf(
      new Map(
        tokens.map((t) => [
          t.id,
          countTerms([
            [t.title, TITLE_WEIGHT],
            [t.rest, 1],
          ]),
        ]),
      ),
    );
    this.titles = tfidf(new Map(tokens.map((t) => [t.id, countTerms([[t.title, 1]])])));
    for (const t of tokens) this.titleLength.set(t.id, new Set(t.title).size);
  }

  get size() {
    return this.full.size;
  }

  similarity(a: number, b: number): number {
    return cosine(this.full.get(a), this.full.get(b));
  }

  titleSimilarity(a: number, b: number): number {
    return cosine(this.titles.get(a), this.titles.get(b));
  }

  isPossibleDuplicate(a: number, b: number): boolean {
    if (this.similarity(a, b) >= DUPLICATE_THRESHOLD) return true;
    const shortest = Math.min(this.titleLength.get(a) ?? 0, this.titleLength.get(b) ?? 0);
    return shortest >= MIN_TITLE_TOKENS_FOR_DUPLICATE && this.titleSimilarity(a, b) >= DUPLICATE_TITLE_THRESHOLD;
  }

  /** Najbardziej podobne karty (bez samej karty), od najwyższego podobieństwa */
  findSimilar(id: number, k = 5): SimilarHit[] {
    if (!this.full.has(id)) return [];
    const hits: SimilarHit[] = [];
    for (const other of this.full.keys()) {
      if (other === id) continue;
      const score = this.similarity(id, other);
      const titleScore = this.titleSimilarity(id, other);
      const possibleDuplicate = this.isPossibleDuplicate(id, other);
      if (score >= MIN_SCORE || possibleDuplicate) hits.push({ id: other, score, titleScore, possibleDuplicate });
    }
    // Duplikaty na górze, potem wg podobieństwa
    return hits
      .sort((a, b) => Number(b.possibleDuplicate) - Number(a.possibleDuplicate) || b.score - a.score || a.id - b.id)
      .slice(0, k);
  }
}
