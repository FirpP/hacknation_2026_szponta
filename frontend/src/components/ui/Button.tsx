import type { ButtonProps } from "./Button.types";

const Button = ({ variant = "primary", className, type = "button", ...props }: ButtonProps) => {
  const classes = ["button", `button--${variant}`, className].filter(Boolean).join(" ");
  return <button type={type} className={classes} {...props} />;
};

export default Button;
