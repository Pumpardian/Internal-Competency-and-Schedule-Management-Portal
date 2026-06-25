/**
 * Шапка портала: бренд, навигация между страницами и текущий пользователь.
 *
 * Показывает логин вошедшего пользователя (из JWT), переключатели языка и темы
 * и кнопку выхода. Подписи берутся из i18n (t).
 */
import type { Page } from "../types";
import type { Theme } from "../hooks/useTheme";
import { LANGS, useT, type Lang } from "../i18n";
import { EmployeeSearch } from "./EmployeeSearch";

interface HeaderProps {
  /** Текущая активная страница. */
  page: Page;
  /** Переключение страницы. */
  setPage: (page: Page) => void;
  /** Логин вошедшего пользователя. */
  username: string;
  /** Выход из системы. */
  onLogout: () => void;
  /** Текущая тема (для иконки переключателя). */
  theme?: Theme;
  /** Переключить тему; если задан — в шапке показывается кнопка. */
  onToggleTheme?: () => void;
  /** Открыть профиль сотрудника из глобального поиска (если задан — поиск виден). */
  onOpenEmployee?: (id: number) => void;
}

/** Верхняя панель с навигацией, поиском, переключателями языка/темы и выходом. */
export function Header({
  page,
  setPage,
  username,
  onLogout,
  theme,
  onToggleTheme,
  onOpenEmployee,
}: HeaderProps) {
  const { t, lang, setLang } = useT();
  return (
    <header className="header">
      <span className="brand">{t("brand")}</span>
      <nav>
        <button className={page === "team" ? "active" : ""} onClick={() => setPage("team")}>
          {t("nav.team")}
        </button>
        <button className={page === "room" ? "active" : ""} onClick={() => setPage("room")}>
          {t("nav.room")}
        </button>
        <button
          className={page === "employees" ? "active" : ""}
          onClick={() => setPage("employees")}
        >
          {t("nav.employees")}
        </button>
        <button className={page === "profile" ? "active" : ""} onClick={() => setPage("profile")}>
          {t("nav.profile")}
        </button>
        <button className={page === "account" ? "active" : ""} onClick={() => setPage("account")}>
          {t("nav.account")}
        </button>
      </nav>
      {onOpenEmployee && <EmployeeSearch onSelect={onOpenEmployee} />}
      <div className="user">
        <select
          aria-label="Язык интерфейса"
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
        >
          {LANGS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        {onToggleTheme && (
          <button
            className="btn"
            onClick={onToggleTheme}
            title={theme === "dark" ? t("themeLight") : t("themeDark")}
            aria-label="Переключить тему"
          >
            {theme === "dark" ? "☀" : "🌙"}
          </button>
        )}
        <span className="user-name">{username}</span>
        <button className="btn" onClick={onLogout}>
          {t("logout")}
        </button>
      </div>
    </header>
  );
}
