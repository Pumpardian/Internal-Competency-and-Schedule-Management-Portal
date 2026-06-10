/**
 * Корневой компонент макета портала.
 *
 * Хранит общее состояние (сотрудники, навыки, уровни, брони, текущий
 * пользователь) и переключает две страницы: «Команда и навыки» и
 * «Переговорная». Данные пока заглушечные (Этап 1).
 */
import { useState } from "react";
import { Header } from "./components/Header";
import { RoomPage } from "./components/RoomPage";
import { TeamPage } from "./components/TeamPage";
import { Toasts } from "./components/Toasts";
import { INITIAL_BOOKINGS, INITIAL_EMPLOYEES, INITIAL_LEVELS, INITIAL_SKILLS } from "./data";
import { useToasts } from "./hooks/useToasts";
import type { Booking, Levels, Page } from "./types";

/** Приложение: шапка, активная страница и слой уведомлений. */
export default function App() {
  // Активная страница и выбранный пользователь (X-User-Id).
  const [page, setPage] = useState<Page>("team");
  const [user, setUser] = useState("admin");
  // Справочники неизменны в макете — отсюда отсутствие сеттеров.
  const [employees] = useState(INITIAL_EMPLOYEES);
  const [skills] = useState(INITIAL_SKILLS);
  // Уровни владения и брони редактируются прямо на страницах.
  const [levels, setLevels] = useState<Levels>(INITIAL_LEVELS);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const { toasts, push } = useToasts();

  return (
    <>
      <Header page={page} setPage={setPage} user={user} setUser={setUser} />
      <div className="mock-note">
        Это визуальный макет (Этап 1). Данные тестовые, не в бд; реальные вызовы API будут добавлены
        на этапах 3–4.
      </div>
      {/* Простейший «роутинг» переключением по состоянию page. */}
      {page === "team" ? (
        <TeamPage
          employees={employees}
          skills={skills}
          levels={levels}
          setLevels={setLevels}
          push={push}
        />
      ) : (
        <RoomPage employees={employees} bookings={bookings} setBookings={setBookings} push={push} />
      )}
      <Toasts toasts={toasts} />
    </>
  );
}
