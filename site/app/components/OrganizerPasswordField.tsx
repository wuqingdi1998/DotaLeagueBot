"use client";

import { useId, useState, type ChangeEventHandler } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

type OrganizerPasswordFieldProps = {
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  autoFocus?: boolean;
  disabled?: boolean;
};

export function OrganizerPasswordField({
  value,
  onChange,
  autoFocus = false,
  disabled = false,
}: OrganizerPasswordFieldProps) {
  const inputId = useId();
  const [isPasswordVisible, setIsPasswordVisible] = useState(true);
  const visibilityLabel = isPasswordVisible ? "Скрыть пароль" : "Показать пароль";

  return (
    <fieldset className="organizer-password-control">
      <legend>Пароль организатора</legend>
      <div className="organizer-password-field">
        <input
          id={inputId}
          type={isPasswordVisible ? "text" : "password"}
          autoComplete="current-password"
          autoFocus={autoFocus}
          required
          disabled={disabled}
          value={value}
          onChange={onChange}
        />
        <button
          className="organizer-password-visibility"
          type="button"
          aria-label={visibilityLabel}
          title={visibilityLabel}
          aria-pressed={isPasswordVisible}
          disabled={disabled}
          onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
        >
          {isPasswordVisible ? (
            <FiEyeOff aria-hidden="true" />
          ) : (
            <FiEye aria-hidden="true" />
          )}
        </button>
      </div>
    </fieldset>
  );
}
