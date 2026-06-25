/**
 * Страница «Регистрация».
 *
 * Создаёт аккаунт через POST /api/register (api.register). Эндпоинт принимает
 * multipart: учётные данные + опциональные данные сотрудника и фото. При успехе
 * сообщает приложению (onSuccess), чтобы вернуть пользователя к форме входа.
 */
import { useState } from "react";
import { register as registerRequest } from "../api";
import { isPasswordStrong } from "../password";
import { useT } from "../i18n";
import { PasswordStrength } from "./PasswordStrength";

interface RegisterPageProps {
  /** Вызывается после успешной регистрации. */
  onSuccess?: () => void;
  /** Переход обратно на страницу входа. */
  onLogin?: () => void;
}

/** Форма регистрации: учётные данные + профиль сотрудника и фото (опционально). */
export function RegisterPage({ onSuccess, onLogin }: RegisterPageProps) {
  const { t } = useT();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [position, setPosition] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /** Отправка формы: создаём аккаунт (с профилем, если заполнен). */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // Клиентская проверка сложности пароля (правила те же, что на бэкенде).
    if (!isPasswordStrong(password)) {
      setError(t("password.weak"));
      return;
    }
    setSubmitting(true);
    try {
      // Данные сотрудника передаём только если указаны имя и фамилия.
      const employee =
        firstName.trim() && lastName.trim()
          ? { first_name: firstName.trim(), last_name: lastName.trim(), position: position.trim() || undefined }
          : undefined;
      await registerRequest(username, password, employee, photo);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <div className="auth-title">{t("register.title")}</div>
        <p className="auth-subtitle">{t("brand")}</p>

        <label className="auth-field">
          <span>{t("register.username")}</span>
          <input
            className="input"
            type="text"
            autoComplete="username"
            placeholder={t("register.usernamePh")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>

        <label className="auth-field">
          <span>{t("register.password")}</span>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            placeholder={t("register.passwordPh")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <PasswordStrength password={password} />

        <label className="auth-field">
          <span>{t("register.firstName")}</span>
          <input
            className="input"
            type="text"
            placeholder={t("register.firstNamePh")}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </label>

        <label className="auth-field">
          <span>{t("register.lastName")}</span>
          <input
            className="input"
            type="text"
            placeholder={t("register.lastNamePh")}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </label>

        <label className="auth-field">
          <span>{t("register.position")}</span>
          <input
            className="input"
            type="text"
            placeholder={t("register.positionPh")}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          />
        </label>

        <label className="auth-field">
          <span>{t("register.photo")}</span>
          <input
            className="input"
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
        </label>

        {error && <div className="auth-error">{error}</div>}

        <button className="btn primary auth-submit" type="submit" disabled={submitting}>
          {submitting ? t("register.submitting") : t("register.submit")}
        </button>

        <button type="button" className="auth-link" onClick={() => onLogin?.()}>
          {t("register.toLogin")}
        </button>
      </form>
    </div>
  );
}
