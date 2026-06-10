/**
 * Загрузка и изменение матрицы компетенций через REST API бэкенда.
 *
 * При монтировании тянет сотрудников, навыки и уровни владения. Изменение
 * уровня выполняется как upsert: если связь сотрудник-навык уже есть — PATCH,
 * иначе — POST (назначение навыка).
 */
import { useCallback, useEffect, useState } from "react";
import {
  assignSkill,
  createEmployee,
  createSkill,
  fetchEmployeeSkills,
  fetchEmployees,
  fetchSkills,
  patchSkillLevel,
} from "../api";
import type { Employee, Levels, Skill } from "../types";

export interface UseCompetency {
  employees: Employee[];
  skills: Skill[];
  /** Уровни владения, ключ `${empId}-${skillId}`. */
  levels: Levels;
  loading: boolean;
  /** Текст последней ошибки загрузки (или null). */
  error: string | null;
  /** Перезагрузить всю матрицу с сервера. */
  reload: () => Promise<void>;
  /** Назначить/изменить уровень владения и сохранить на сервере. */
  setLevel: (empId: number, skillId: number, value: number) => Promise<void>;
  addEmployee: (firstName: string, lastName: string, position?: string) => Promise<void>;
  addSkill: (name: string, category: string) => Promise<void>;
}

export function useCompetency(): UseCompetency {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [levels, setLevels] = useState<Levels>({});
  // Пары `${empId}-${skillId}`, для которых на сервере уже есть запись.
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [emps, sks] = await Promise.all([fetchEmployees(), fetchSkills()]);
      // Навыки каждого сотрудника тянем параллельно и собираем карту уровней.
      const perEmployee = await Promise.all(emps.map((e) => fetchEmployeeSkills(e.id)));
      const lv: Levels = {};
      const asg = new Set<string>();
      emps.forEach((e, i) => {
        for (const es of perEmployee[i]) {
          const key = e.id + "-" + es.id;
          lv[key] = es.level;
          asg.add(key);
        }
      });
      setEmployees(emps);
      setSkills(sks);
      setLevels(lv);
      setAssigned(asg);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const setLevel = useCallback(
    async (empId: number, skillId: number, value: number) => {
      const key = empId + "-" + skillId;
      if (assigned.has(key)) {
        await patchSkillLevel(empId, skillId, value);
      } else {
        await assignSkill(empId, skillId, value);
        setAssigned((prev) => new Set(prev).add(key));
      }
      setLevels((prev) => ({ ...prev, [key]: value }));
    },
    [assigned],
  );

  const addEmployee = useCallback(
    async (firstName: string, lastName: string, position?: string) => {
      await createEmployee(firstName, lastName, position);
      await reload();
    },
    [reload],
  );

  const addSkill = useCallback(
    async (name: string, category: string) => {
      await createSkill(name, category);
      await reload();
    },
    [reload],
  );

  return { employees, skills, levels, loading, error, reload, setLevel, addEmployee, addSkill };
}
