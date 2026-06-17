/**
 * Страница «Авторизация» (вход в портал).
 *
 * Отправляет логин/пароль на POST /api/login через api.login, сохраняет
 * полученный JWT и сообщает приложению об успехе (onSuccess). Ссылка onRegister
 * переключает на страницу регистрации.
 */
import { useState } from "react";
import { login as loginRequest } from "../api";

interface LoginPageProps {
  /** Вызывается после успешного входа (токен уже сохранён). */
  onSuccess?: () => void;
  /** Переход на страницу регистрации. */
  onRegister?: () => void;
}

/** Форма входа: логин и пароль. */
export function LoginPage({ onSuccess, onRegister }: LoginPageProps) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /** Отправка формы: запрос токена и переход в приложение при успехе. */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginRequest(login, password);
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
        <div className="auth-title">Вход на портал</div>
        <p className="auth-subtitle">Портал Отдела цифровизации</p>

        <label className="auth-field">
          <span>Логин</span>
          <input
            className="input"
            type="text"
            autoComplete="username"
            placeholder="Введите логин"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          />
        </label>

        <label className="auth-field">
          <span>Пароль</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            placeholder="Введите пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <div className="auth-error">{error}</div>}

        <button className="btn primary auth-submit" type="submit" disabled={submitting}>
          {submitting ? "Вход…" : "Войти"}
        </button>

        <button type="button" className="auth-link" onClick={() => onRegister?.()}>
          Нет аккаунта? Зарегистрироваться
        </button>
      </form>
    </div>
  );
}
