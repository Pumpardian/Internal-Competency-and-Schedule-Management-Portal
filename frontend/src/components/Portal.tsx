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
import { EmployeeCard } from "./EmployeeCard";
import { EmployeesPage } from "./EmployeesPage";
import { Header } from "./Header";
import { ProfilePage } from "./ProfilePage";
import { RoomPage } from "./RoomPage";
import { TeamPage } from "./TeamPage";
import { Toasts } from "./Toasts";
import { useAllEmployees } from "../hooks/useAllEmployees";
import { useCompetency } from "../hooks/useCompetency";
import { useToasts } from "../hooks/useToasts";
import type { Theme } from "../hooks/useTheme";
import { useT } from "../i18n";
import type { Page } from "../types";

interface PortalProps {
  /** Выход из системы (сброс токена и возврат на экран входа). */
  onLogout: () => void;
  /** Текущая тема (для переключателя в шапке). */
  theme?: Theme;
  /** Переключить тему. */
  onToggleTheme?: () => void;
}

/** Портал: шапка, активная страница и слой уведомлений. */
export function Portal({ onLogout, theme, onToggleTheme }: PortalProps) {
  const { t } = useT();
  // Активная страница.
  const [page, setPage] = useState<Page>("team");
  // Открытый профиль сотрудника (по клику из матрицы); null — обычные страницы.
  const [profileEmpId, setProfileEmpId] = useState<number | null>(null);
  // Переход по вкладкам сбрасывает открытый профиль.
  const goTo = (p: Page) => {
    setProfileEmpId(null);
    setPage(p);
  };
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
  // Полный справочник сотрудников для брони (выбор организатора не должен
  // ограничиваться текущей страницей матрицы компетенций).
  const { employees: allEmployees } = useAllEmployees();
  const { toasts, push } = useToasts();

  return (
    <>
      <Header
        page={page}
        setPage={goTo}
        username={username}
        onLogout={onLogout}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onOpenEmployee={setProfileEmpId}
      />
      {/* Открытый профиль сотрудника (из матрицы) поверх обычных страниц. */}
      {profileEmpId !== null ? (
        <div className="page">
          <button className="btn" onClick={() => setProfileEmpId(null)}>
            {t("btn.back")}
          </button>
          <div style={{ marginTop: 16 }}>
            <EmployeeCard employeeId={profileEmpId} />
          </div>
        </div>
      ) : (
        <>
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
              onOpenEmployee={setProfileEmpId}
              employeePage={employeePage}
              employeeTotalPages={employeeTotalPages}
              onEmployeePage={setEmployeePage}
              skillPage={skillPage}
              skillTotalPages={skillTotalPages}
              onSkillPage={setSkillPage}
              push={push}
            />
          )}
          {page === "room" && <RoomPage employees={allEmployees} push={push} />}
          {page === "employees" && <EmployeesPage />}
          {page === "profile" && <ProfilePage />}
          {page === "account" && <AccountPage push={push} onLogout={onLogout} />}
        </>
      )}
      <Toasts toasts={toasts} />
    </>
  );
}
