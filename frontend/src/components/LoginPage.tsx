/**
 * Страница «Авторизация» (вход в портал).
 *
 * Это только UI-каркас. Реальная авторизация (JWT, запрос к бэкенду,
 * хранение токена, редиректы) ещё не подключена - отправка формы пока ничего не
 * делает. Маршрут существует в псевдороутере (App.tsx), но в навигацию не
 * выведен.
 */
import { useState } from "react";

/** Форма входа: логин и пароль. Без серверной логики (заглушка). */
export function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  /** Пока отправка отключена — просто гасим перезагрузку страницы. */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: вызвать POST /api/auth/login, сохранить JWT и перейти на портал.
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

        <button className="btn primary auth-submit" type="submit">
          Войти
        </button>
      </form>
    </div>
  );
}
