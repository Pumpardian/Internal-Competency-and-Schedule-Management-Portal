/**
 * Корневой компонент портала.
 *
 * Матрицу компетенций (сотрудники, навыки, уровни) загружает с бэкенда через
 * хук useCompetency и передаёт на страницу «Команда и навыки». Брони
 * переговорной пока хранятся локально (заглушка) — серверной части для них нет.
 */
import { useState } from "react";
import { Header } from "./components/Header";
import { RoomPage } from "./components/RoomPage";
import { TeamPage } from "./components/TeamPage";
import { Toasts } from "./components/Toasts";
import { INITIAL_BOOKINGS } from "./data";
import { useCompetency } from "./hooks/useCompetency";
import { useToasts } from "./hooks/useToasts";
import type { Booking, Page } from "./types";

/** Приложение: шапка, активная страница и слой уведомлений. */
export default function App() {
  // Активная страница и выбранный пользователь (X-User-Id).
  const [page, setPage] = useState<Page>("team");
  const [user, setUser] = useState("admin");
  // Матрица компетенций с бэкенда.
  const { employees, skills, levels, loading, error, reload, setLevel, addEmployee, addSkill } =
    useCompetency();
  // Брони переговорной — пока локальная заглушка.
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const { toasts, push } = useToasts();

  return (
    <>
      <Header page={page} setPage={setPage} user={user} setUser={setUser} />
      {/* Простейший «роутинг» переключением по состоянию page. */}
      {page === "team" ? (
        <TeamPage
          employees={employees}
          skills={skills}
          levels={levels}
          loading={loading}
          error={error}
          onReload={reload}
          onSetLevel={setLevel}
          onAddEmployee={addEmployee}
          onAddSkill={addSkill}
          push={push}
        />
      ) : (
        <RoomPage employees={employees} bookings={bookings} setBookings={setBookings} push={push} />
      )}
      <Toasts toasts={toasts} />
    </>
  );
}
