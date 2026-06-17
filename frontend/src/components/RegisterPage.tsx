/**
 * Страница «Регистрация».
 *
 * Создаёт аккаунт через POST /api/register (api.register). Эндпоинт принимает
 * multipart: учётные данные + опциональные данные сотрудника и фото. При успехе
 * сообщает приложению (onSuccess), чтобы вернуть пользователя к форме входа.
 */
import { useState } from "react";
import { register as registerRequest } from "../api";

interface RegisterPageProps {
  /** Вызывается после успешной регистрации. */
  onSuccess?: () => void;
  /** Переход обратно на страницу входа. */
  onLogin?: () => void;
}

/** Форма регистрации: учётные данные + профиль сотрудника и фото (опционально). */
export function RegisterPage({ onSuccess, onLogin }: RegisterPageProps) {
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
        <div className="auth-title">Регистрация</div>
        <p className="auth-subtitle">Портал Отдела цифровизации</p>

        <label className="auth-field">
          <span>Логин</span>
          <input
            className="input"
            type="text"
            autoComplete="username"
            placeholder="Придумайте логин"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>

        <label className="auth-field">
          <span>Пароль</span>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            placeholder="Придумайте пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <label className="auth-field">
          <span>Имя</span>
          <input
            className="input"
            type="text"
            placeholder="Имя сотрудника"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </label>

        <label className="auth-field">
          <span>Фамилия</span>
          <input
            className="input"
            type="text"
            placeholder="Фамилия сотрудника"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </label>

        <label className="auth-field">
          <span>Должность</span>
          <input
            className="input"
            type="text"
            placeholder="Должность (необязательно)"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          />
        </label>

        <label className="auth-field">
          <span>Фото</span>
          <input
            className="input"
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
        </label>

        {error && <div className="auth-error">{error}</div>}

        <button className="btn primary auth-submit" type="submit" disabled={submitting}>
          {submitting ? "Регистрация…" : "Зарегистрироваться"}
        </button>

        <button type="button" className="auth-link" onClick={() => onLogin?.()}>
          Уже есть аккаунт? Войти
        </button>
      </form>
    </div>
  );
}
