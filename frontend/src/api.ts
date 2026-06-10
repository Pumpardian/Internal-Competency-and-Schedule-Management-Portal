/**
 * Клиент REST API бэкенда (подсистема «Матрица компетенций»).
 *
 * Преобразует ответы сервера в типы, которые ожидают компоненты, и единообразно
 * пробрасывает ошибки (с текстом из поля detail) для показа в уведомлениях.
 */
import type { Employee, Skill } from "./types";

/** Базовый адрес API; задаётся через VITE_API_BASE, иначе локальный бэкенд. */
const API_BASE = (import.meta.env.VITE_API_BASE ?? "http://localhost:8000/api").replace(/\/+$/, "");

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

/** Обёртка над fetch: добавляет заголовки и разворачивает ошибки сервера. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API_BASE + path, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body && body.detail) detail = String(body.detail);
    } catch {
      // тело ответа без JSON — оставляем статус как есть
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

/** Приводит сотрудника бэкенда к виду, удобному интерфейсу. */
function toEmployee(e: ApiEmployee): Employee {
  const name = [e.last_name, e.first_name].filter(Boolean).join(" ");
  return { id: e.id, name, position: e.position ?? "" };
}

/** GET /employees — список сотрудников. */
export async function fetchEmployees(): Promise<Employee[]> {
  const data = await request<ApiEmployee[]>("/employees");
  return data.map(toEmployee);
}

/** GET /skills — список навыков. */
export function fetchSkills(): Promise<Skill[]> {
  return request<Skill[]>("/skills");
}

/** GET /employees/{id}/skills — навыки сотрудника с уровнями. */
export function fetchEmployeeSkills(empId: number): Promise<ApiEmployeeSkill[]> {
  return request<ApiEmployeeSkill[]>(`/employees/${empId}/skills`);
}

/** POST /employees/{empId}/skills/{skillId} — назначить навык с уровнем. */
export function assignSkill(empId: number, skillId: number, level: number): Promise<unknown> {
  return request(`/employees/${empId}/skills/${skillId}`, {
    method: "POST",
    body: JSON.stringify({ level }),
  });
}

/** PATCH /employees/{empId}/skills/{skillId} — изменить уровень владения. */
export function patchSkillLevel(empId: number, skillId: number, level: number): Promise<unknown> {
  return request(`/employees/${empId}/skills/${skillId}`, {
    method: "PATCH",
    body: JSON.stringify({ level }),
  });
}

/** POST /employees — создать сотрудника. */
export function createEmployee(
  first_name: string,
  last_name: string,
  position?: string,
): Promise<unknown> {
  return request("/employees", {
    method: "POST",
    body: JSON.stringify({ first_name, last_name, position }),
  });
}

/** POST /skills — создать навык. */
export function createSkill(name: string, category: string): Promise<unknown> {
  return request("/skills", {
    method: "POST",
    body: JSON.stringify({ name, category }),
  });
}
