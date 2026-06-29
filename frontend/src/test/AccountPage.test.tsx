import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AccountPage } from "../components/AccountPage";
import {
  currentUser, getProfile, getRole, fetchRoles, fetchUsers,
  updateProfile, deleteAccount,
} from "../api";
import type { Employee } from "../types";

vi.mock("../api", () => ({
  currentUser: vi.fn(), getProfile: vi.fn(), getRole: vi.fn(),
  fetchRoles: vi.fn(), fetchUsers: vi.fn(),
  updateProfile: vi.fn(), updateUserRole: vi.fn(), deleteAccount: vi.fn(),
}));

const emp: Employee = { id: 5, name: "Петров Иван", firstName: "Иван", lastName: "Петров", position: "Разработчик" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(currentUser).mockReturnValue({ id: 1, username: "ivanov" });
  vi.mocked(getProfile).mockResolvedValue(emp);
  vi.mocked(getRole).mockResolvedValue({ id: 2, name: "user" });
  vi.mocked(fetchRoles).mockResolvedValue([]);
  vi.mocked(fetchUsers).mockResolvedValue([]);
  vi.mocked(updateProfile).mockResolvedValue();
  vi.mocked(deleteAccount).mockResolvedValue();
});

describe("AccountPage", () => {
  it("показывает логин и заполняет поля профиля", async () => {
    render(<AccountPage push={vi.fn()} onLogout={vi.fn()} />);
    expect(await screen.findByDisplayValue("Петров")).toBeTruthy();
    expect(screen.getByDisplayValue("Иван")).toBeTruthy();
    expect(screen.getByDisplayValue("Разработчик")).toBeTruthy();
    expect(screen.getByText("ivanov")).toBeTruthy();
  });

  it("не сохраняет без текущего пароля", async () => {
    const push = vi.fn();
    render(<AccountPage push={push} onLogout={vi.fn()} />);
    fireEvent.click(await screen.findByText("Сохранить изменения"));
    expect(push).toHaveBeenCalledWith(expect.objectContaining({ type: "error", title: "Нужен пароль" }));
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("сохраняет изменения с подтверждением паролем", async () => {
    const push = vi.fn();
    render(<AccountPage push={push} onLogout={vi.fn()} />);
    await screen.findByDisplayValue("Петров");
    fireEvent.change(screen.getByPlaceholderText("Введите текущий пароль"), { target: { value: "pass" } });
    fireEvent.click(screen.getByText("Сохранить изменения"));
    await waitFor(() => expect(updateProfile).toHaveBeenCalled());
    expect(updateProfile).toHaveBeenCalledWith(
      1, "pass",
      { newPassword: undefined, employee: { first_name: "Иван", last_name: "Петров", position: "Разработчик" } },
      null,
    );
    expect(push).toHaveBeenCalledWith(expect.objectContaining({ title: "Профиль обновлён" }));
  });

  it("удаляет аккаунт после ввода пароля и выходит из системы", async () => {
    const onLogout = vi.fn();
    render(<AccountPage push={vi.fn()} onLogout={onLogout} />);
    fireEvent.change(await screen.findByPlaceholderText("Введите пароль для подтверждения"), { target: { value: "pass" } });
    fireEvent.click(screen.getByText("Удалить аккаунт"));
    await waitFor(() => expect(deleteAccount).toHaveBeenCalledWith(1, "pass"));
    expect(onLogout).toHaveBeenCalled();
  });
});
