/**
 * Страница «Профиль» — карточка текущего пользователя.
 *
 * Показывает профиль вошедшего пользователя (его сотрудника) и навыки. Никакого
 * выбора чужого сотрудника здесь нет — это именно «мой профиль». Идентификатор
 * сотрудника определяется по текущему пользователю (GET /users/{id}).
 */
import { useEffect, useState } from "react";
import { currentUser, getProfile } from "../api";
import { EmployeeCard } from "./EmployeeCard";

/** Страница собственного профиля. */
export function ProfilePage() {
  const myUserId = currentUser()?.id;
  // undefined — ещё грузим; null — у аккаунта нет сотрудника; число — id сотрудника.
  const [employeeId, setEmployeeId] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    if (myUserId === undefined) {
      setEmployeeId(null);
      return;
    }
    let active = true;
    getProfile(myUserId)
      .then((emp) => active && setEmployeeId(emp?.id ?? null))
      .catch(() => active && setEmployeeId(null));
    return () => {
      active = false;
    };
  }, [myUserId]);

  return (
    <div className="page">
      <h1>Профиль</h1>
      <p className="subtitle">Ваша карточка: личные данные и навыки с уровнями владения.</p>

      {employeeId === undefined && <div className="card">Загрузка…</div>}
      {employeeId === null && (
        <div className="card">К вашему аккаунту не привязан профиль сотрудника.</div>
      )}
      {typeof employeeId === "number" && <EmployeeCard employeeId={employeeId} />}
    </div>
  );
}
