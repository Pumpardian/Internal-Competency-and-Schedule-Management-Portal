/**
 * Клиент REST API бэкенда (подсистема «Матрица компетенций»).
 *
 * Преобразует ответы сервера в типы, которые ожидают компоненты, и единообразно
 * пробрасывает ошибки (с текстом из поля detail) для показа в уведомлениях.
 */
import type { Booking, BookingDraft, Employee, Skill } from "./types";
import axios from "axios";

/** Экземпляр axios: базовый адрес API + общие заголовки. Адрес задаётся через
 *  VITE_API_BASE, иначе — локальный бэкенд (роуты отдаются под префиксом /api). */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? "http://localhost:8000/api",
  headers: { "Content-Type": "application/json" },
});

/** Ключ, под которым JWT хранится в localStorage. */
const TOKEN_KEY = "portal_token";

/** Текущий JWT (или null, если пользователь не авторизован). */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** Сохранить JWT после успешного входа. */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/** Удалить JWT (выход из системы / истёкший токен). */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Подставляем токен в заголовок Authorization для всех запросов. */
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
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

/** Страничный ответ бэкенда (формат PagenatedResponse). */
interface ApiPage<T> {
  page_size: number;
  current_page: number;
  total_pages: number;
  data: T[];
}

/** Страница данных в виде, удобном интерфейсу. */
export interface Page<T> {
  /** Элементы текущей страницы. */
  data: T[];
  /** Номер текущей страницы (с 1). */
  currentPage: number;
  /** Размер страницы. */
  pageSize: number;
  /** Общее количество страниц. */
  totalPages: number;
}

/** Событие, по которому приложение возвращает пользователя на экран входа. */
export const AUTH_UNAUTHORIZED_EVENT = "auth:unauthorized";

/** Переводим ошибки axios в обычные Error с текстом из поля detail сервера. */
api.interceptors.response.use(
  (res) => res, // успешный ответ пропускаем как есть
  (err) => {
    // Истёкший/невалидный токен: чистим его и сигналим приложению о выходе.
    if (err.response?.status === 401) {
      clearToken();
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
    }
    const detail = err.response?.data?.detail;
    const status = err.response ? `${err.response.status} ${err.response.statusText}` : err.message;
    throw new Error(detail ? String(detail) : status);
  },
);

/** Приводит сотрудника бэкенда к виду, удобному интерфейсу. */
function toEmployee(e: ApiEmployee): Employee {
  const name = [e.last_name, e.first_name].filter(Boolean).join(" ");
  return {
    id: e.id,
    name,
    firstName: e.first_name,
    lastName: e.last_name,
    position: e.position ?? "",
    photoUrl: e.photo_url ?? undefined,
    createdAt: e.created_at,
  };
}

/** GET /employees — страница списка сотрудников. */
export async function fetchEmployees(currentPage = 1, pageSize = 10): Promise<Page<Employee>> {
  const { data } = await api.get<ApiPage<ApiEmployee>>("/employees", {
    params: { current_page: currentPage, page_size: pageSize },
  });
  return {
    data: data.data.map(toEmployee),
    currentPage: data.current_page,
    pageSize: data.page_size,
    totalPages: data.total_pages,
  };
}

/** GET /employees/{id} — детальные данные одного сотрудника (для профиля). */
export async function fetchEmployee(id: number): Promise<Employee> {
  const { data } = await api.get<ApiEmployee>(`/employees/${id}`);
  return toEmployee(data);
}

/** GET /skills — страница списка навыков. */
export async function fetchSkills(currentPage = 1, pageSize = 10): Promise<Page<Skill>> {
  const { data } = await api.get<ApiPage<Skill>>("/skills", {
    params: { current_page: currentPage, page_size: pageSize },
  });
  return {
    data: data.data,
    currentPage: data.current_page,
    pageSize: data.page_size,
    totalPages: data.total_pages,
  };
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

/** POST /employees — создать сотрудника. Эндпоинт принимает multipart: поле
 *  `form` со строкой JSON и опциональное фото (здесь без фото). */
export async function createEmployee(
  first_name: string,
  last_name: string,
  position?: string,
): Promise<void> {
  const form = new FormData();
  form.append("form", JSON.stringify({ first_name, last_name, position }));
  await api.post("/employees", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

/** POST /skills — создать навык. */
export async function createSkill(name: string, category: string): Promise<void> {
  await api.post("/skills", { name, category });
}

/** PATCH /employees/{id} — обновить данные сотрудника (поля опциональны).
 *  Эндпоинт принимает multipart: поле `form` со строкой JSON и опциональное фото. */
export async function updateEmployee(
  id: number,
  fields: { first_name?: string; last_name?: string; position?: string },
): Promise<void> {
  const form = new FormData();
  form.append("form", JSON.stringify(fields));
  await api.patch(`/employees/${id}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

/** DELETE /employees/{id} — удалить сотрудника. */
export async function deleteEmployee(id: number): Promise<void> {
  await api.delete(`/employees/${id}`);
}

/** PATCH /skills/{id} — обновить навык (бэкенд ожидает оба поля). */
export async function updateSkill(id: number, name: string, category: string): Promise<void> {
  await api.patch(`/skills/${id}`, { name, category });
}

/** DELETE /skills/{id} — удалить навык. */
export async function deleteSkill(id: number): Promise<void> {
  await api.delete(`/skills/${id}`);
}

/** DELETE /employees/{empId}/skills/{skillId} — снять навык у сотрудника. */
export async function removeEmployeeSkill(empId: number, skillId: number): Promise<void> {
  await api.delete(`/employees/${empId}/skills/${skillId}`);
}

/** Бронь в формате бэкенда (полные даты-время начала и конца). */
interface ApiBooking {
  id: number;
  employee_id: number;
  topic: string;
  start_time: string;
  end_time: string;
}

/** Часы/минуты из ISO-времени. Календарь оперирует «настенными» часами в UTC,
 *  поэтому читаем и пишем время единообразно в UTC — без сдвигов часового пояса. */
function parseHM(iso: string): { h: number; m: number } {
  const d = new Date(iso);
  return { h: d.getUTCHours(), m: d.getUTCMinutes() };
}

/** Собирает ISO-datetime (UTC) из дня (YYYY-MM-DD) и часа/минуты. */
function isoDateTime(date: string, h: number, m: number): string {
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${date}T${hh}:${mm}:00Z`;
}

/** Приводит бронь бэкенда к виду, удобному календарю. */
function toBooking(b: ApiBooking): Booking {
  const s = parseHM(b.start_time);
  const e = parseHM(b.end_time);
  return {
    id: b.id,
    topic: b.topic,
    empId: b.employee_id,
    startH: s.h,
    startM: s.m,
    endH: e.h,
    endM: e.m,
  };
}

/** GET /bookings — брони за указанный день (YYYY-MM-DD). */
export async function fetchBookings(date: string): Promise<Booking[]> {
  const { data } = await api.get<ApiBooking[]>("/bookings", { params: { book_date: date } });
  return data.map(toBooking);
}

/** POST /bookings — создать бронь на указанный день. */
export async function createBooking(date: string, draft: BookingDraft): Promise<Booking> {
  const { data } = await api.post<ApiBooking>("/bookings", {
    employee_id: draft.empId,
    topic: draft.topic,
    start_time: isoDateTime(date, draft.startH, draft.startM),
    end_time: isoDateTime(date, draft.endH, draft.endM),
  });
  return toBooking(data);
}

/** DELETE /bookings/{id} — удалить бронь. */
export async function deleteBooking(id: number): Promise<void> {
  await api.delete(`/bookings/${id}`);
}

/** Ответ бэкенда на успешный вход. */
interface ApiToken {
  access_token: string;
  token_type: string;
}

/** POST /login — вход по логину/паролю. Эндпоинт ждёт форму OAuth2
 *  (x-www-form-urlencoded), а не JSON. При успехе сохраняем токен. */
export async function login(username: string, password: string): Promise<void> {
  const body = new URLSearchParams({ username, password });
  const { data } = await api.post<ApiToken>("/login", body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  setToken(data.access_token);
}

/** Данные сотрудника для регистрации (профиль создаётся вместе с аккаунтом). */
export interface RegisterEmployee {
  first_name: string;
  last_name: string;
  position?: string;
}

/** POST /register — регистрация пользователя. Эндпоинт принимает multipart:
 *  поле `form` со строкой JSON (username/password/employee_data) и опциональный
 *  файл `photo`. Поэтому собираем FormData, а не отправляем обычный JSON. */
export async function register(
  username: string,
  password: string,
  employee?: RegisterEmployee,
  photo?: File | null,
): Promise<void> {
  const payload = { username, password, employee_data: employee ?? null };
  const form = new FormData();
  form.append("form", JSON.stringify(payload));
  if (photo) {
    form.append("photo", photo);
  }
  await api.post("/register", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

/** Текущий пользователь, извлечённый из payload JWT (id и логин). */
export interface CurrentUser {
  id: number;
  username: string;
}

/** Разбирает payload JWT (без проверки подписи — она на бэкенде) и достаёт
 *  идентификатор и логин текущего пользователя. */
export function currentUser(): CurrentUser | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (typeof payload.id !== "number" || typeof payload.user !== "string") return null;
    return { id: payload.id, username: payload.user };
  } catch {
    return null;
  }
}

/** Роль пользователя в формате бэкенда. */
export interface ApiRole {
  id: number;
  name: string;
}

/** GET /users/{id} — профиль (данные сотрудника) пользователя. Если у
 *  пользователя нет привязанного сотрудника, бэкенд отдаёт сообщение — тогда
 *  возвращаем null. */
export async function getProfile(id: number): Promise<Employee | null> {
  const { data } = await api.get<ApiEmployee | null>(`/users/${id}`);
  if (!data || typeof data !== "object" || !("id" in data)) return null;
  return toEmployee(data);
}

/** GET /users/{id}/role — роль пользователя. */
export async function getRole(id: number): Promise<ApiRole> {
  const { data } = await api.get<ApiRole>(`/users/${id}/role`);
  return data;
}

/** GET /roles — список ролей (для выбора при смене роли пользователя). */
export async function fetchRoles(): Promise<ApiRole[]> {
  const { data } = await api.get<ApiPage<ApiRole>>("/roles", {
    params: { current_page: 1, page_size: 20 },
  });
  return data.data;
}

/** GET /roles/{id}/permissions — названия прав роли (для проверки доступа на фронте). */
export async function fetchRolePermissions(roleId: number): Promise<string[]> {
  const { data } = await api.get<{ id: number; name: string }[]>(`/roles/${roleId}/permissions`);
  return data.map((p) => p.name);
}

/** Пользователь в списке (для выбора при смене роли). */
export interface ApiUserListItem {
  id: number;
  username: string;
  full_name: string | null;
}

/** GET /users — список пользователей (id, логин, ФИО). Доступен при праве
 *  user_role.update — используется для выбора пользователя при смене роли. */
export async function fetchUsers(): Promise<ApiUserListItem[]> {
  const { data } = await api.get<ApiUserListItem[]>("/users");
  return data;
}

/** Изменяемые поля профиля сотрудника (все опциональны). */
export interface ProfileEmployeeUpdate {
  first_name?: string;
  last_name?: string;
  position?: string;
}

/** PATCH /users/{id}/profile — обновление профиля. Эндпоинт принимает multipart:
 *  поле `form` со строкой JSON (текущий пароль обязателен, новый пароль и данные
 *  сотрудника опциональны) и опциональный файл `photo`. */
export async function updateProfile(
  id: number,
  password: string,
  changes: { newPassword?: string; employee?: ProfileEmployeeUpdate },
  photo?: File | null,
): Promise<void> {
  const payload: Record<string, unknown> = { password };
  if (changes.newPassword) payload.new_password = changes.newPassword;
  if (changes.employee) payload.employee_data = changes.employee;
  const form = new FormData();
  form.append("form", JSON.stringify(payload));
  if (photo) {
    form.append("photo", photo);
  }
  await api.patch(`/users/${id}/profile`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

/** POST /users/{id}/role — сменить роль пользователя (нужно право
 *  user_role.update; есть у роли admin). Эндпоинт ждёт role_id сырым числом в
 *  теле (Body без embed), а не объектом. */
export async function updateUserRole(id: number, roleId: number): Promise<void> {
  await api.post(`/users/${id}/role`, roleId);
}

/** DELETE /user/{id} — удалить аккаунт. Требуется пароль удаляемого аккаунта
 *  (или права администратора). */
export async function deleteAccount(id: number, password: string): Promise<void> {
  await api.delete(`/user/${id}`, { data: { password } });
}
