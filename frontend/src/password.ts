/**
 * Клиентская проверка сложности пароля.
 *
 * Правила повторяют серверную валидацию (backend/routers/user.py): минимум
 * 8 символов, заглавная и строчная латинские буквы, цифра и спецсимвол.
 */

/** Набор спецсимволов — как в регулярке бэкенда. */
const SPECIAL = /[!@#$%^&*()_+\-=[\]{};:"\\|,.<>/?]/;

/** Результат поэлементной проверки пароля. */
export interface PasswordChecks {
  /** Длина не менее 8 символов. */
  length: boolean;
  /** Есть заглавная латинская буква. */
  upper: boolean;
  /** Есть строчная латинская буква. */
  lower: boolean;
  /** Есть цифра. */
  digit: boolean;
  /** Есть спецсимвол. */
  special: boolean;
}

/** Проверяет пароль по каждому критерию сложности. */
export function passwordChecks(password: string): PasswordChecks {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /\d/.test(password),
    special: SPECIAL.test(password),
  };
}

/** Пароль удовлетворяет всем требованиям сложности. */
export function isPasswordStrong(password: string): boolean {
  const c = passwordChecks(password);
  return c.length && c.upper && c.lower && c.digit && c.special;
}
