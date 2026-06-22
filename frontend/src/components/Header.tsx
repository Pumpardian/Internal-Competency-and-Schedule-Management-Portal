/**
 * Шапка портала: бренд, навигация между страницами и текущий пользователь.
 *
 * Показывает логин вошедшего пользователя (из JWT) и кнопку выхода.
 */
import type { Page } from "../types";

interface HeaderProps {
  /** Текущая активная страница. */
  page: Page;
  /** Переключение страницы. */
  setPage: (page: Page) => void;
  /** Логин вошедшего пользователя. */
  username: string;
  /** Выход из системы. */
  onLogout: () => void;
}

/** Верхняя панель с навигацией, именем пользователя и выходом. */
export function Header({ page, setPage, username, onLogout }: HeaderProps) {
  return (
    <header className="header">
      <span className="brand">Портал Отдела цифровизации</span>
      <nav>
        <button className={page === "team" ? "active" : ""} onClick={() => setPage("team")}>
          Команда и навыки
        </button>
        <button className={page === "room" ? "active" : ""} onClick={() => setPage("room")}>
          Переговорная
        </button>
        <button
          className={page === "employees" ? "active" : ""}
          onClick={() => setPage("employees")}
        >
          Сотрудники
        </button>
        <button className={page === "profile" ? "active" : ""} onClick={() => setPage("profile")}>
          Профиль
        </button>
        <button className={page === "account" ? "active" : ""} onClick={() => setPage("account")}>
          Аккаунт
        </button>
      </nav>
      <div className="user">
        <span className="user-name">{username}</span>
        <button className="btn" onClick={onLogout}>
          Выйти
        </button>
      </div>
    </header>
  );
}
