/**
 * Шапка портала: бренд, навигация между страницами и выбор пользователя.
 *
 * Селектор «X-User-Id» имитирует упрощённую идентификацию пользователя
 * (одноимённый заголовок запроса) — на её основе позже строится проверка прав.
 */
import type { Page } from "../types";

interface HeaderProps {
  /** Текущая активная страница. */
  page: Page;
  /** Переключение страницы. */
  setPage: (page: Page) => void;
  /** Текущий идентификатор пользователя (значение заголовка X-User-Id). */
  user: string;
  /** Смена пользователя. */
  setUser: (user: string) => void;
}

/** Верхняя панель с навигацией и переключателем пользователя. */
export function Header({ page, setPage, user, setUser }: HeaderProps) {
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
        <button className={page === "profile" ? "active" : ""} onClick={() => setPage("profile")}>
          Профиль
        </button>
      </nav>
      <div className="user">
        <span>X-User-Id:</span>
        <select value={user} onChange={(e) => setUser(e.target.value)}>
          <option value="admin">admin</option>
          <option value="ivanov">ivanov</option>
          <option value="petrova">petrova</option>
        </select>
      </div>
    </header>
  );
}
