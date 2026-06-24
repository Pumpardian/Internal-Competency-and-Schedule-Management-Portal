/**
 * Точка входа клиентского приложения.
 * Монтирует корневой компонент App в элемент #root и подключает стили.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { LanguageProvider } from "./i18n";
import "./styles.css";

// Элемент #root объявлен в index.html; "!" — он гарантированно присутствует.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);
