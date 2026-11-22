import { QueryClient } from "@tanstack/react-query";
import { isApiError } from "@/lib/api-client";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Przez 30 s dane są świeże
      // Użycie useQuery z tym samym queryKey w tym czasie nie wywoła ponownie zapytania
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // nie ponawiaj błędów 4xx (np. 404, 422) – tylko awarie sieci i 5xx
        if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});
