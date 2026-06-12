/**
 * Корневой компонент портала.
 *
 * Матрицу компетенций (сотрудники, навыки, уровни) загружает с бэкенда через
 * хук useCompetency и передаёт на страницу «Команда и навыки». Брони
 * переговорной грузит страница RoomPage через хук useBookings (тоже с бэкенда).
 */
import { useState } from "react";
import { Header } from "./components/Header";
import { RoomPage } from "./components/RoomPage";
import { TeamPage } from "./components/TeamPage";
import { Toasts } from "./components/Toasts";
import { useCompetency } from "./hooks/useCompetency";
import { useToasts } from "./hooks/useToasts";
import type { Page } from "./types";

/** Приложение: шапка, активная страница и слой уведомлений. */
export default function App() {
  // Активная страница и выбранный пользователь (X-User-Id).
  const [page, setPage] = useState<Page>("team");
  const [user, setUser] = useState("admin");
  // Матрица компетенций с бэкенда.
  const {
    employees,
    skills,
    levels,
    loading,
    error,
    reload,
    setLevel,
    addEmployee,
    addSkill,
    editEmployee,
    removeEmployee,
    editSkill,
    removeSkill,
    removeSkillFromEmployee,
    employeePage,
    employeeTotalPages,
    setEmployeePage,
    skillPage,
    skillTotalPages,
    setSkillPage,
  } = useCompetency();
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
          onEditEmployee={editEmployee}
          onRemoveEmployee={removeEmployee}
          onEditSkill={editSkill}
          onRemoveSkill={removeSkill}
          onRemoveSkillFromEmployee={removeSkillFromEmployee}
          employeePage={employeePage}
          employeeTotalPages={employeeTotalPages}
          onEmployeePage={setEmployeePage}
          skillPage={skillPage}
          skillTotalPages={skillTotalPages}
          onSkillPage={setSkillPage}
          push={push}
        />
      ) : (
        <RoomPage employees={employees} push={push} />
      )}
      <Toasts toasts={toasts} />
    </>
  );
}
