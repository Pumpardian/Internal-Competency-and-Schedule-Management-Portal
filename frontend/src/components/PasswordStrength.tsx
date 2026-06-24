/**
 * Индикатор сложности пароля: чек-лист требований с отметками.
 * Показывается только при непустом пароле. Правила берутся из password.ts.
 */
import { passwordChecks, type PasswordChecks } from "../password";
import { useT } from "../i18n";

interface PasswordStrengthProps {
  /** Проверяемый пароль. */
  password: string;
}

/** Пять требований и их i18n-ключи. */
const RULES: { key: keyof PasswordChecks; label: string }[] = [
  { key: "length", label: "password.length" },
  { key: "upper", label: "password.upper" },
  { key: "lower", label: "password.lower" },
  { key: "digit", label: "password.digit" },
  { key: "special", label: "password.special" },
];

/** Чек-лист требований к паролю. */
export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { t } = useT();
  if (!password) return null;
  const checks = passwordChecks(password);
  return (
    <ul className="pw-checks" aria-label="Требования к паролю">
      {RULES.map((r) => (
        <li key={r.key} className={checks[r.key] ? "ok" : "no"}>
          <span className="pw-mark">{checks[r.key] ? "✓" : "○"}</span> {t(r.label)}
        </li>
      ))}
    </ul>
  );
}
