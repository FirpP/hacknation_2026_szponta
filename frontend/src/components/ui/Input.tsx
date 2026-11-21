import { useId } from "react";
import type { InputProps } from "./Input.types";

const Input = ({ label, error, id, ...props }: InputProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <input id={inputId} className="input" aria-invalid={error ? true : undefined} {...props} />
      {error && <small className="error">{error}</small>}
    </div>
  );
};

export default Input;
