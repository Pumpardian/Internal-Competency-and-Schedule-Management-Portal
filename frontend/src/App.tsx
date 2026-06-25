/**
 * Корневой компонент портала.
 *
 * Управляет авторизацией: пока нет JWT — показывает страницы входа/регистрации,
 * после входа монтирует портал (Portal). Запросы к защищённым данным уходят
 * только из Portal, поэтому до авторизации лишних 401 не возникает.
 */
import { useEffect, useState } from "react";
import { AUTH_UNAUTHORIZED_EVENT, clearToken, getToken } from "./api";
import { LoginPage } from "./components/LoginPage";
import { RegisterPage } from "./components/RegisterPage";
import { Portal } from "./components/Portal";
import { useTheme } from "./hooks/useTheme";

/** Приложение: гейт авторизации поверх портала. */
export default function App() {
  // Тема оформления (применяется к корню документа на любом экране).
  const { theme, toggle: toggleTheme } = useTheme();
  // Признак авторизации (есть ли сохранённый токен).
  const [authed, setAuthed] = useState(() => !!getToken());
  // Активная страница гейта, когда пользователь не авторизован.
  const [authPage, setAuthPage] = useState<"login" | "register">("login");

  // Истёкший/невалидный токен (событие из api.ts) возвращает на экран входа.
  useEffect(() => {
    const onUnauthorized = () => setAuthed(false);
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  if (!authed) {
    return authPage === "login" ? (
      <LoginPage onSuccess={() => setAuthed(true)} onRegister={() => setAuthPage("register")} />
    ) : (
      <RegisterPage onSuccess={() => setAuthPage("login")} onLogin={() => setAuthPage("login")} />
    );
  }

  const handleLogout = () => {
    clearToken();
    setAuthed(false);
  };

  return <Portal onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} />;
}
