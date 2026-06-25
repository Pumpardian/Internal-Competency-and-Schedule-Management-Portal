import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import axios from "axios";

// Подменяем axios: api.ts при импорте вызывает axios.create() и вешает
// перехватчики — мок возвращает один и тот же инстанс с мок-методами.
vi.mock("axios", () => {
  const instance = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  };
  return { default: { create: vi.fn(() => instance) } };
});

import {
  fetchEmployees,
  fetchEmployee,
  fetchBookings,
  createBooking,
  updateBooking,
  createEmployee,
  register,
  login,
  getProfile,
  getToken,
  fetchUsers,
  AUTH_UNAUTHORIZED_EVENT,
} from "../api";

// Инстанс и перехватчики захватываем на этапе импорта (до beforeEach).
const inst = (axios as unknown as { create: Mock }).create.mock.results[0].value as {
  get: Mock; post: Mock; patch: Mock; delete: Mock;
  interceptors: { request: { use: Mock }; response: { use: Mock } };
};
const onRequest = inst.interceptors.request.use.mock.calls[0][0] as (c: { headers: Record<string, string> }) => { headers: Record<string, string> };
const onRejected = inst.interceptors.response.use.mock.calls[0][1] as (e: unknown) => never;

const apiEmployee = {
  id: 5, first_name: "Иван", last_name: "Петров", position: "Разработчик",
  photo_url: null, created_at: "2025-01-02T10:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("fetchEmployees / toEmployee", () => {
  it("маппит сотрудника бэкенда и пагинацию", async () => {
    inst.get.mockResolvedValue({
      data: { page_size: 10, current_page: 2, total_pages: 3, data: [apiEmployee] },
    });
    const page = await fetchEmployees(2, 10);
    expect(inst.get).toHaveBeenCalledWith("/employees", { params: { current_page: 2, page_size: 10 } });
    expect(page).toEqual({
      data: [{
        id: 5, name: "Петров Иван", firstName: "Иван", lastName: "Петров",
        position: "Разработчик", photoUrl: undefined, createdAt: "2025-01-02T10:00:00Z",
      }],
      currentPage: 2, pageSize: 10, totalPages: 3,
    });
  });

  it("position по умолчанию пустая строка, photoUrl из photo_url", async () => {
    inst.get.mockResolvedValue({ data: { ...apiEmployee, position: null, photo_url: "/p.jpg" } });
    const emp = await fetchEmployee(5);
    expect(emp.position).toBe("");
    expect(emp.photoUrl).toBe("/p.jpg");
  });
});

describe("fetchBookings / createBooking (UTC)", () => {
  it("читает часы/минуты из ISO в UTC", async () => {
    inst.get.mockResolvedValue({
      data: [{ id: 1, employee_id: 3, topic: "Планёрка", start_time: "2026-06-08T09:30:00Z", end_time: "2026-06-08T10:45:00Z" }],
    });
    const list = await fetchBookings("2026-06-08");
    expect(list[0]).toEqual({ id: 1, topic: "Планёрка", empId: 3, startH: 9, startM: 30, endH: 10, endM: 45 });
  });

  it("собирает ISO-время с Z и маппит ответ", async () => {
    inst.post.mockResolvedValue({
      data: { id: 9, employee_id: 2, topic: "Демо", start_time: "2026-06-08T11:00:00Z", end_time: "2026-06-08T12:00:00Z" },
    });
    await createBooking("2026-06-08", { topic: "Демо", empId: 2, startH: 11, startM: 0, endH: 12, endM: 0 });
    expect(inst.post).toHaveBeenCalledWith("/bookings", {
      employee_id: 2, topic: "Демо", start_time: "2026-06-08T11:00:00Z", end_time: "2026-06-08T12:00:00Z",
    });
  });

  it("PATCH /bookings/{id} — обновляет бронь и маппит ответ", async () => {
    inst.patch.mockResolvedValue({
      data: { id: 9, employee_id: 2, topic: "Новая тема", start_time: "2026-06-08T11:00:00Z", end_time: "2026-06-08T12:00:00Z" },
    });
    const r = await updateBooking(9, "2026-06-08", { topic: "Новая тема", empId: 2, startH: 11, startM: 0, endH: 12, endM: 0 });
    expect(inst.patch).toHaveBeenCalledWith("/bookings/9", {
      employee_id: 2, topic: "Новая тема", start_time: "2026-06-08T11:00:00Z", end_time: "2026-06-08T12:00:00Z",
    });
    expect(r).toMatchObject({ id: 9, topic: "Новая тема", empId: 2, startH: 11, endH: 12 });
  });
});

describe("multipart-запросы", () => {
  it("createEmployee кладёт JSON в поле form", async () => {
    inst.post.mockResolvedValue({ data: {} });
    await createEmployee("Иван", "Петров", "Разработчик");
    const [url, body, cfg] = inst.post.mock.calls[0];
    expect(url).toBe("/employees");
    expect(body).toBeInstanceOf(FormData);
    expect(JSON.parse((body as FormData).get("form") as string)).toEqual({
      first_name: "Иван", last_name: "Петров", position: "Разработчик",
    });
    expect(cfg.headers["Content-Type"]).toBe("multipart/form-data");
  });

  it("register добавляет фото только при его наличии", async () => {
    inst.post.mockResolvedValue({ data: {} });
    const file = new File(["x"], "a.png", { type: "image/png" });
    await register("user", "pass", { first_name: "И", last_name: "П" }, file);
    const body = inst.post.mock.calls[0][1] as FormData;
    expect(body.get("photo")).toBeInstanceOf(File);
    expect(JSON.parse(body.get("form") as string)).toMatchObject({ username: "user", password: "pass" });
  });
});

describe("login", () => {
  it("шлёт x-www-form-urlencoded и сохраняет токен", async () => {
    inst.post.mockResolvedValue({ data: { access_token: "tok123", token_type: "bearer" } });
    await login("ivanov", "secret");
    const [url, body, cfg] = inst.post.mock.calls[0];
    expect(url).toBe("/login");
    expect(body.toString()).toContain("username=ivanov");
    expect(cfg.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(getToken()).toBe("tok123");
  });
});

describe("getProfile", () => {
  it("возвращает null, если у пользователя нет сотрудника", async () => {
    inst.get.mockResolvedValue({ data: null });
    expect(await getProfile(1)).toBeNull();
    inst.get.mockResolvedValue({ data: { message: "no employee" } });
    expect(await getProfile(1)).toBeNull();
  });

  it("маппит сотрудника, если он есть", async () => {
    inst.get.mockResolvedValue({ data: apiEmployee });
    const emp = await getProfile(1);
    expect(emp?.name).toBe("Петров Иван");
  });
});

describe("fetchUsers (пагинация)", () => {
  it("листает все страницы и собирает полный список", async () => {
    inst.get
      .mockResolvedValueOnce({ data: { page_size: 20, current_page: 1, total_pages: 2, data: [{ id: 1, username: "a", full_name: "Иванов Иван" }] } })
      .mockResolvedValueOnce({ data: { page_size: 20, current_page: 2, total_pages: 2, data: [{ id: 2, username: "b", full_name: null }] } });
    const users = await fetchUsers();
    expect(users).toEqual([
      { id: 1, username: "a", full_name: "Иванов Иван" },
      { id: 2, username: "b", full_name: null },
    ]);
    expect(inst.get).toHaveBeenCalledTimes(2);
    expect(inst.get).toHaveBeenNthCalledWith(1, "/users", { params: { current_page: 1, page_size: 20 } });
    expect(inst.get).toHaveBeenNthCalledWith(2, "/users", { params: { current_page: 2, page_size: 20 } });
  });
});

describe("перехватчики", () => {
  it("request добавляет заголовок Authorization при наличии токена", () => {
    localStorage.setItem("portal_token", "tok");
    const cfg = onRequest({ headers: {} });
    expect(cfg.headers.Authorization).toBe("Bearer tok");
  });

  it("response мапит detail сервера в текст ошибки", () => {
    expect(() => onRejected({ response: { status: 400, statusText: "Bad", data: { detail: "Время занято" } } })).toThrow("Время занято");
  });

  it("на 401 чистит токен и шлёт событие выхода", () => {
    localStorage.setItem("portal_token", "tok");
    const handler = vi.fn();
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handler);
    expect(() => onRejected({ response: { status: 401, statusText: "Unauthorized", data: {} } })).toThrow();
    expect(getToken()).toBeNull();
    expect(handler).toHaveBeenCalled();
    window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handler);
  });
});
