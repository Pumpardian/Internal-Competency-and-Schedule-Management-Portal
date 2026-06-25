import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import App from "../App";
import { getToken } from "../api";

// Подменяем весь api: App с порталом тянет матрицу/права — отдаём пустые данные.
vi.mock("../api", () => ({
  AUTH_UNAUTHORIZED_EVENT: "auth:unauthorized",
  getToken: vi.fn(),
  clearToken: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  currentUser: vi.fn(() => ({ id: 1, username: "ivanov" })),
  fetchEmployees: vi.fn(async () => ({ data: [], currentPage: 1, pageSize: 10, totalPages: 1 })),
  fetchSkills: vi.fn(async () => ({ data: [], currentPage: 1, pageSize: 8, totalPages: 1 })),
  fetchEmployeeSkills: vi.fn(async () => []),
  getProfile: vi.fn(async () => null),
  getRole: vi.fn(async () => ({ id: 1, name: "user" })),
  fetchRolePermissions: vi.fn(async () => []),
}));
const mToken = vi.mocked(getToken);

beforeEach(() => vi.clearAllMocks());

describe("App (гейт авторизации)", () => {
  it("без токена показывает страницу входа", () => {
    mToken.mockReturnValue(null);
    render(<App />);
    expect(screen.getByText("Вход на портал")).toBeTruthy();
  });

  it("с токеном монтирует портал", async () => {
    mToken.mockReturnValue("tok");
    render(<App />);
    expect(await screen.findByText("Портал Отдела цифровизации")).toBeTruthy();
  });

  it("событие 401 возвращает на экран входа", async () => {
    mToken.mockReturnValue("tok");
    render(<App />);
    await screen.findByText("Портал Отдела цифровизации");
    act(() => {
      window.dispatchEvent(new Event("auth:unauthorized"));
    });
    await waitFor(() => expect(screen.getByText("Вход на портал")).toBeTruthy());
  });
});
