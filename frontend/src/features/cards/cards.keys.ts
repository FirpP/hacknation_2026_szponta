import type { CardsQuery } from "@/lib/types/cards.types";

// Klucze zapytań w jednym miejscu: te same w hookach i przy unieważnianiu cache
export const cardsKeys = {
  all: ["cards"] as const,
  list: (query: CardsQuery) => ["cards", "list", query] as const,
  detail: (id: number) => ["cards", "detail", id] as const,
  similar: (id: number) => ["cards", "similar", id] as const,
  stats: ["stats"] as const,
  runs: ["runs"] as const,
};
