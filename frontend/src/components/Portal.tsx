/**
 * Портал авторизованного пользователя.
 *
 * Матрицу компетенций (сотрудники, навыки, уровни) загружает с бэкенда через
 * хук useCompetency и передаёт на страницу «Команда и навыки». Брони
 * переговорной грузит RoomPage через useBookings. Монтируется только после
 * входа, поэтому защищённые запросы уходят уже с токеном.
 */
import { useState } from "react";
import { currentUser } from "../api";
import { AccountPage } from "./AccountPage";
import { Header } from "./Header";
import { ProfilePage } from "./ProfilePage";
import { RoomPage } from "./RoomPage";
import { TeamPage } from "./TeamPage";
import { Toasts } from "./Toasts";
import { useCompetency } from "../hooks/useCompetency";
import { useToasts } from "../hooks/useToasts";
import type { Page } from "../types";

interface PortalProps {
  /** Выход из системы (сброс токена и возврат на экран входа). */
  onLogout: () => void;
}

/** Портал: шапка, активная страница и слой уведомлений. */
export function Portal({ onLogout }: PortalProps) {
  // Активная страница.
  const [page, setPage] = useState<Page>("team");
  // Текущий пользователь из токена (для шапки).
  const username = currentUser()?.username ?? "";
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
      <Header page={page} setPage={setPage} username={username} onLogout={onLogout} />
      {/* Простейший «роутинг» переключением по состоянию page. */}
      {page === "team" && (
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
      )}
      {page === "room" && <RoomPage employees={employees} push={push} />}
      {page === "profile" && <ProfilePage employees={employees} />}
      {page === "account" && <AccountPage push={push} onLogout={onLogout} />}
      <Toasts toasts={toasts} />
    </>
  );
}
