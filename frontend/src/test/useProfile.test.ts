import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useProfile } from "../hooks/useProfile";
import { fetchEmployee, fetchEmployeeSkills } from "../api";
import type { Employee } from "../types";

vi.mock("../api", () => ({ fetchEmployee: vi.fn(), fetchEmployeeSkills: vi.fn() }));

const mockEmp = vi.mocked(fetchEmployee);
const mockSkills = vi.mocked(fetchEmployeeSkills);

const emp: Employee = { id: 5, name: "Петров Иван", firstName: "Иван", lastName: "Петров", position: "Разработчик" };

beforeEach(() => vi.clearAllMocks());

describe("useProfile", () => {
  it("при null id ничего не грузит", async () => {
    const { result } = renderHook(() => useProfile(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockEmp).not.toHaveBeenCalled();
    expect(result.current.employee).toBeNull();
    expect(result.current.skills).toEqual([]);
  });

  it("загружает сотрудника и его навыки", async () => {
    mockEmp.mockResolvedValue(emp);
    mockSkills.mockResolvedValue([{ id: 10, name: "Python", category: "language", level: 4 }]);
    const { result } = renderHook(() => useProfile(5));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockEmp).toHaveBeenCalledWith(5);
    expect(result.current.employee).toEqual(emp);
    expect(result.current.skills).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it("сохраняет ошибку при сбое", async () => {
    mockEmp.mockRejectedValue(new Error("404 Not Found"));
    mockSkills.mockResolvedValue([]);
    const { result } = renderHook(() => useProfile(5));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("404 Not Found");
  });
});
