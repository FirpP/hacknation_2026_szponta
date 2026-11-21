// Klucze zapytań w jednym miejscu - te same w hookach, invalidateQueries i query-client.ts
export const authKeys = {
  me: ["auth", "me"] as const,
};
