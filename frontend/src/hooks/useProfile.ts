/**
 * Загрузка карточки профиля сотрудника через REST API бэкенда.
 *
 * Профиль строится на существующих эндпоинтах: детали сотрудника
 * (GET /employees/{id}) и его навыки с уровнями (GET /employees/{id}/skills).
 * При смене выбранного сотрудника данные перезагружаются.
 */
import { useCallback, useEffect, useState } from "react";
import { fetchEmployee, fetchEmployeeSkills, type ApiEmployeeSkill } from "../api";
import type { Employee } from "../types";

export interface UseProfile {
  /** Детальные данные сотрудника (или null, пока не загружено). */
  employee: Employee | null;
  /** Навыки сотрудника с уровнями владения. */
  skills: ApiEmployeeSkill[];
  loading: boolean;
  /** Текст последней ошибки загрузки (или null). */
  error: string | null;
  /** Перезагрузить профиль текущего сотрудника. */
  reload: () => Promise<void>;
}

export function useProfile(employeeId: number | null): UseProfile {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [skills, setSkills] = useState<ApiEmployeeSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (employeeId === null) {
      setEmployee(null);
      setSkills([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Детали и навыки тянем параллельно — оба эндпоинта независимы.
      const [emp, sks] = await Promise.all([
        fetchEmployee(employeeId),
        fetchEmployeeSkills(employeeId),
      ]);
      setEmployee(emp);
      setSkills(sks);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { employee, skills, loading, error, reload };
}
