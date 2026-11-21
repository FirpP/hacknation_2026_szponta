import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { isApiError } from "@/lib/api-client";
import { authKeys } from "@/features/auth/auth.keys";

// 401 z dowolnego zapytania = sesja wygasła. Czyścimy dane zalogowanego pracownika,
// a <RequireAuth> przekieruje na /login.
const handleUnauthorized = (error: unknown) => {
  if (isApiError(error, 401)) {
    queryClient.setQueryData(authKeys.me, null);
  }
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleUnauthorized }),
  mutationCache: new MutationCache({ onError: handleUnauthorized }),
  defaultOptions: {
    queries: {
      // Przez 30 s dane są świeże
      // Użycie useQuery z tym samym queryKey w tym czasie nie wywoła ponownie zapytania
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // nie ponawiaj błędów 4xx (np. 401/404) – tylko awarie sieci i 5xx
        if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});
