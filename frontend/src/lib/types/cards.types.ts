import type { components } from "@/lib/api-types";

export type CardSummary = components["schemas"]["CardSummary"];
export type CardDetail = components["schemas"]["CardDetail"];
export type CardsPage = components["schemas"]["CardsPage"];
export type Evidence = components["schemas"]["Evidence"];
export type ScrapeRun = components["schemas"]["ScrapeRun"];
export type Stats = components["schemas"]["Stats"];
export type Recommendation = components["schemas"]["Recommendation"];
export type SimilarCard = components["schemas"]["SimilarCard"];

export type Domain = CardSummary["domain"];
export type ImplementationStatus = CardSummary["implementationStatus"];
export type FieldBasis = CardSummary["fieldBasis"][string];
export type RunStatus = ScrapeRun["status"];
export type RecommendedPath = Recommendation["path"];
export type Audience = Recommendation["audiences"][number];

export type CardSort = "innovationScore" | "applicationPotentialScore" | "credibilityScore" | "trl" | "analyzedAt";

/** Parametry GET /cards (te same nazwy co w CardsQuerySchema w backendzie) */
export type CardsQuery = {
  q?: string;
  domain?: Domain;
  status?: ImplementationStatus;
  source?: string;
  trlMin?: number;
  trlMax?: number;
  isInnovation?: boolean;
  audience?: Audience;
  path?: RecommendedPath;
  sort?: CardSort;
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};
