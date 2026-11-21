import type { InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  // Komunikat błędu pola (np. z ApiError.details), wyświetlany pod polem
  error?: string;
};
