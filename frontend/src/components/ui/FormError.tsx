type FormErrorProps = {
  error: unknown;
};

// Ogólny komunikat błędu formularza. Błędy konkretnych pól: <Input error={fieldError(error, "email")} />
const FormError = ({ error }: FormErrorProps) => {
  if (!error) return null;
  return (
    <p className="error" role="alert">
      {error instanceof Error ? error.message : "Wystąpił nieznany błąd"}
    </p>
  );
};

export default FormError;
