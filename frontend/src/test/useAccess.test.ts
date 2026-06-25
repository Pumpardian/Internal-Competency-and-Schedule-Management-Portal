import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAccess } from "../hooks/useAccess";
import { currentUser, getProfile, getRole, fetchRolePermissions } from "../api";
import type { Employee } from "../types";

vi.mock("../api", () => ({
  currentUser: vi.fn(),
  getProfile: vi.fn(),
  getRole: vi.fn(),
  fetchRolePermissions: vi.fn(),
}));

const mockMe = vi.mocked(currentUser);
const mockProfile = vi.mocked(getProfile);
const mockRole = vi.mocked(getRole);
const mockPerms = vi.mocked(fetchRolePermissions);

const emp: Employee = { id: 3, name: "Петров Иван", firstName: "Иван", lastName: "Петров", position: "" };

beforeEach(() => vi.clearAllMocks());

describe("useAccess", () => {
  it("без авторизации: загрузка завершена, прав нет", async () => {
    mockMe.mockReturnValue(null);
    const { result } = renderHook(() => useAccess());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.can("booking.create")).toBe(false);
    expect(result.current.employee).toBeNull();
    expect(mockProfile).not.toHaveBeenCalled();
  });

  it("загружает профиль и права роли, can() проверяет наличие права", async () => {
    mockMe.mockReturnValue({ id: 3, username: "ivanov" });
    mockProfile.mockResolvedValue(emp);
    mockRole.mockResolvedValue({ id: 1, name: "admin" });
    mockPerms.mockResolvedValue(["booking.create", "employee.update"]);
    const { result } = renderHook(() => useAccess());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.employee).toEqual(emp);
    expect(result.current.can("booking.create")).toBe(true);
    expect(result.current.can("employee.update")).toBe(true);
    expect(result.current.can("skill.delete")).toBe(false);
    expect(mockPerms).toHaveBeenCalledWith(1);
  });

  it("при ошибке загрузки остаётся в ограниченном режиме без прав", async () => {
    mockMe.mockReturnValue({ id: 3, username: "ivanov" });
    mockProfile.mockRejectedValue(new Error("500"));
    mockRole.mockRejectedValue(new Error("500"));
    const { result } = renderHook(() => useAccess());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.permissions.size).toBe(0);
    expect(result.current.can("booking.create")).toBe(false);
  });
});
