import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, isApiError } from "@/lib/api-client";
import type { Employee, LoginBody } from "@/lib/types/auth.types";
import { authKeys } from "@/features/auth/auth.keys";

/**
 * Zalogowany pracownik albo null (brak sesji). Cookie jest HttpOnly, więc o sesję pytamy backend (GET /panel).
 * 401 to nie błąd, tylko informacja "niezalogowany".
 */
export const useMe = () =>
  useQuery({
    queryKey: authKeys.me,
    queryFn: async ({ signal }): Promise<Employee | null> => {
      try {
        return await api.get<Employee>("/panel", signal);
      } catch (error) {
        if (isApiError(error, 401)) return null;
        throw error;
      }
    },
    staleTime: 5 * 60_000,
  });

export const useLogin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: LoginBody) => api.post<void>("/auth/login", body),
    // Zwracamy Promise, żeby mutate(..., { onSuccess }) w komponencie ruszył dopiero po pobraniu useMe -
    // inaczej <RequireAuth> zobaczyłby jeszcze stare null i odbił z powrotem na /login
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.me }),
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>("/auth/logout"),
    onSuccess: () => {
      // Dane chronione nie mogą zostać w cache po wylogowaniu
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== authKeys.me[0] });
      queryClient.setQueryData(authKeys.me, null);
    },
  });
};
