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
  deleteEmployee,
  deleteSkill,
  fetchEmployeeSkills,
  fetchEmployees,
  fetchSkills,
  patchSkillLevel,
  removeEmployeeSkill,
  updateEmployee,
  updateSkill,
} from "../api";
import type { Employee, Levels, Skill } from "../types";

/** Сотрудников на одной странице матрицы (строки). */
const EMPLOYEES_PER_PAGE = 10;
/** Навыков на одной странице матрицы (столбцы). */
const SKILLS_PER_PAGE = 8;

export interface UseCompetency {
  employees: Employee[];
  skills: Skill[];
  /** Уровни владения, ключ `${empId}-${skillId}`. */
  levels: Levels;
  loading: boolean;
  /** Текст последней ошибки загрузки (или null). */
  error: string | null;
  /** Перезагрузить текущие страницы матрицы с сервера. */
  reload: () => Promise<void>;
  /** Назначить/изменить уровень владения и сохранить на сервере. */
  setLevel: (empId: number, skillId: number, value: number) => Promise<void>;
  addEmployee: (firstName: string, lastName: string, position?: string) => Promise<void>;
  addSkill: (name: string, category: string) => Promise<void>;
  /** Обновить данные сотрудника (PATCH /employees/{id}). */
  editEmployee: (
    id: number,
    fields: { first_name?: string; last_name?: string; position?: string },
  ) => Promise<void>;
  /** Удалить сотрудника (DELETE /employees/{id}). */
  removeEmployee: (id: number) => Promise<void>;
  /** Обновить навык (PATCH /skills/{id}). */
  editSkill: (id: number, name: string, category: string) => Promise<void>;
  /** Удалить навык (DELETE /skills/{id}). */
  removeSkill: (id: number) => Promise<void>;
  /** Снять навык у сотрудника (DELETE /employees/{empId}/skills/{skillId}). */
  removeSkillFromEmployee: (empId: number, skillId: number) => Promise<void>;
  /** Текущая страница сотрудников (строки), с 1. */
  employeePage: number;
  /** Всего страниц сотрудников. */
  employeeTotalPages: number;
  /** Перейти на страницу сотрудников. */
  setEmployeePage: (page: number) => void;
  /** Текущая страница навыков (столбцы), с 1. */
  skillPage: number;
  /** Всего страниц навыков. */
  skillTotalPages: number;
  /** Перейти на страницу навыков. */
  setSkillPage: (page: number) => void;
}

export function useCompetency(): UseCompetency {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [levels, setLevels] = useState<Levels>({});
  // Пары `${empId}-${skillId}`, для которых на сервере уже есть запись.
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Пагинация: строки (сотрудники) и столбцы (навыки) листаются независимо.
  const [employeePage, setEmployeePage] = useState(1);
  const [employeeTotalPages, setEmployeeTotalPages] = useState(1);
  const [skillPage, setSkillPage] = useState(1);
  const [skillTotalPages, setSkillTotalPages] = useState(1);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [empPage, skillsPage] = await Promise.all([
        fetchEmployees(employeePage, EMPLOYEES_PER_PAGE),
        fetchSkills(skillPage, SKILLS_PER_PAGE),
      ]);
      const emps = empPage.data;
      const sks = skillsPage.data;
      // Навыки каждого сотрудника текущей страницы тянем параллельно и собираем карту уровней.
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
      setEmployeeTotalPages(empPage.totalPages);
      setSkillTotalPages(skillsPage.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [employeePage, skillPage]);

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
      // Новый сотрудник добавляется в конец списка — переходим на последнюю страницу.
      const fresh = await fetchEmployees(1, EMPLOYEES_PER_PAGE);
      if (fresh.totalPages === employeePage) {
        await reload(); // номер страницы не меняется — обновляем вручную
      } else {
        setEmployeePage(fresh.totalPages);
      }
    },
    [reload, employeePage],
  );

  const addSkill = useCallback(
    async (name: string, category: string) => {
      await createSkill(name, category);
      // Новый навык добавляется в конец списка — переходим на последнюю страницу.
      const fresh = await fetchSkills(1, SKILLS_PER_PAGE);
      if (fresh.totalPages === skillPage) {
        await reload(); // номер страницы не меняется — обновляем вручную
      } else {
        setSkillPage(fresh.totalPages);
      }
    },
    [reload, skillPage],
  );

  const editEmployee = useCallback(
    async (id: number, fields: { first_name?: string; last_name?: string; position?: string }) => {
      await updateEmployee(id, fields);
      await reload();
    },
    [reload],
  );

  const removeEmployee = useCallback(
    async (id: number) => {
      await deleteEmployee(id);
      // Удалили единственную запись на непервой странице — шаг назад, иначе обновляем.
      if (employees.length === 1 && employeePage > 1) {
        setEmployeePage(employeePage - 1);
      } else {
        await reload();
      }
    },
    [reload, employees.length, employeePage],
  );

  const editSkill = useCallback(
    async (id: number, name: string, category: string) => {
      await updateSkill(id, name, category);
      await reload();
    },
    [reload],
  );

  const removeSkill = useCallback(
    async (id: number) => {
      await deleteSkill(id);
      if (skills.length === 1 && skillPage > 1) {
        setSkillPage(skillPage - 1);
      } else {
        await reload();
      }
    },
    [reload, skills.length, skillPage],
  );

  const removeSkillFromEmployee = useCallback(async (empId: number, skillId: number) => {
    await removeEmployeeSkill(empId, skillId);
    const key = empId + "-" + skillId;
    setLevels((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setAssigned((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  return {
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
  };
}
