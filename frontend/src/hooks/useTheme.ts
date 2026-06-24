/**
 * Тема оформления (светлая/тёмная).
 *
 * Хранит выбор в localStorage и применяет его к корню документа через атрибут
 * `data-theme` — стили переопределяют CSS-переменные для тёмной темы.
 */
import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

/** Ключ, под которым тема хранится в localStorage. */
const THEME_KEY = "portal_theme";

/** Начальная тема: из localStorage, иначе светлая. */
function initialTheme(): Theme {
  return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
}

export interface UseTheme {
  /** Текущая тема. */
  theme: Theme;
  /** Переключить светлую/тёмную. */
  toggle: () => void;
}

/** Управляет темой и синхронизирует её с DOM и localStorage. */
export function useTheme(): UseTheme {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  return { theme, toggle };
}
