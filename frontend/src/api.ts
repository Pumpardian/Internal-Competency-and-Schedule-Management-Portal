/**
 * Клиент REST API бэкенда (подсистема «Матрица компетенций»).
 *
 * Преобразует ответы сервера в типы, которые ожидают компоненты, и единообразно
 * пробрасывает ошибки (с текстом из поля detail) для показа в уведомлениях.
 */
import type { Employee, Skill } from "./types";
import axios from "axios";

/** Экземпляр axios: базовый адрес API + общие заголовки. Адрес задаётся через
 *  VITE_API_BASE, иначе — локальный бэкенд (роуты отдаются под префиксом /api). */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? "http://localhost:8000/api",
  headers: { "Content-Type": "application/json" },
});

/** Сотрудник в формате бэкенда (фамилия и имя раздельно). */
interface ApiEmployee {
  id: number;
  first_name: string;
  last_name: string;
  position: string | null;
  photo_url: string | null;
  created_at: string;
}

/** Навык сотрудника с уровнем владения (ответ GET /employees/{id}/skills). */
export interface ApiEmployeeSkill {
  id: number;
  name: string;
  category: string;
  level: number;
}

/** Переводим ошибки axios в обычные Error с текстом из поля detail сервера. */
api.interceptors.response.use(
  (res) => res, // успешный ответ пропускаем как есть
  (err) => {
    const detail = err.response?.data?.detail;
    const status = err.response ? `${err.response.status} ${err.response.statusText}` : err.message;
    throw new Error(detail ? String(detail) : status);
  },
);

/** Приводит сотрудника бэкенда к виду, удобному интерфейсу. */
function toEmployee(e: ApiEmployee): Employee {
  const name = [e.last_name, e.first_name].filter(Boolean).join(" ");
  return { id: e.id, name, position: e.position ?? "" };
}

/** GET /employees — список сотрудников. */
export async function fetchEmployees(): Promise<Employee[]> {
  const { data } = await api.get<ApiEmployee[]>("/employees");
  return data.map(toEmployee);
}

/** GET /skills — список навыков. */
export async function fetchSkills(): Promise<Skill[]> {
  const { data } = await api.get<Skill[]>("/skills");
  return data;
}

/** GET /employees/{id}/skills — навыки сотрудника с уровнями. */
export async function fetchEmployeeSkills(empId: number): Promise<ApiEmployeeSkill[]> {
  const { data } = await api.get<ApiEmployeeSkill[]>(`/employees/${empId}/skills`);
  return data;
}

/** POST /employees/{empId}/skills/{skillId} — назначить навык с уровнем. */
export async function assignSkill(empId: number, skillId: number, level: number): Promise<void> {
  await api.post(`/employees/${empId}/skills/${skillId}`, { level });
}

/** PATCH /employees/{empId}/skills/{skillId} — изменить уровень владения. */
export async function patchSkillLevel(empId: number, skillId: number, level: number): Promise<void> {
  await api.patch(`/employees/${empId}/skills/${skillId}`, { level });
}

/** POST /employees — создать сотрудника. */
export async function createEmployee(
  first_name: string,
  last_name: string,
  position?: string,
): Promise<void> {
  await api.post("/employees", { first_name, last_name, position });
}

/** POST /skills — создать навык. */
export async function createSkill(name: string, category: string): Promise<void> {
  await api.post("/skills", { name, category });
}
