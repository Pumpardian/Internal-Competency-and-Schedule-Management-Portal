import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Доступ к переменным окружения сборки без зависимости от @types/node.
declare const process: { env: Record<string, string | undefined> };

// Порт, на который браузер открывает websocket HMR. За nginx это внешний порт
// прокси (80), задаётся через VITE_HMR_CLIENT_PORT; при прямом запуске — 5173.
const hmrClientPort = process.env.VITE_HMR_CLIENT_PORT
  ? Number(process.env.VITE_HMR_CLIENT_PORT)
  : undefined;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    hmr: hmrClientPort ? { clientPort: hmrClientPort } : undefined,
    // На Windows-хосте события файловой системы не доходят до контейнера через
    // bind-mount, поэтому следим за изменениями опросом (иначе нет хот-релоада).
    watch: { usePolling: true },
  },
});