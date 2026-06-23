import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCompetency } from "../hooks/useCompetency";
import {
  fetchEmployees, fetchSkills, fetchEmployeeSkills,
  assignSkill, patchSkillLevel, removeEmployeeSkill,
} from "../api";
import type { Employee, Skill } from "../types";

vi.mock("../api", () => ({
  fetchEmployees: vi.fn(), fetchSkills: vi.fn(), fetchEmployeeSkills: vi.fn(),
  assignSkill: vi.fn(), patchSkillLevel: vi.fn(), createEmployee: vi.fn(), createSkill: vi.fn(),
  deleteEmployee: vi.fn(), deleteSkill: vi.fn(), updateEmployee: vi.fn(), updateSkill: vi.fn(),
  removeEmployeeSkill: vi.fn(),
}));

const mEmps = vi.mocked(fetchEmployees);
const mSkills = vi.mocked(fetchSkills);
const mEmpSkills = vi.mocked(fetchEmployeeSkills);
const mAssign = vi.mocked(assignSkill);
const mPatch = vi.mocked(patchSkillLevel);
const mRemove = vi.mocked(removeEmployeeSkill);

const emp = (id: number): Employee => ({ id, name: "E" + id, firstName: "E", lastName: String(id), position: "" });
const sk: Skill = { id: 10, name: "Python", category: "language" };

function primeLoad() {
  mEmps.mockResolvedValue({ data: [emp(1), emp(2)], currentPage: 1, pageSize: 10, totalPages: 2 });
  mSkills.mockResolvedValue({ data: [sk], currentPage: 1, pageSize: 8, totalPages: 1 });
  mEmpSkills.mockImplementation(async (id: number) =>
    id === 1 ? [{ id: 10, name: "Python", category: "language", level: 3 }] : [],
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  primeLoad();
});

describe("useCompetency", () => {
  it("собирает карту уровней и пагинацию при загрузке", async () => {
    const { result } = renderHook(() => useCompetency());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.employees).toHaveLength(2);
    expect(result.current.skills).toHaveLength(1);
    expect(result.current.levels).toEqual({ "1-10": 3 });
    expect(result.current.employeeTotalPages).toBe(2);
  });

  it("setLevel: для новой связи вызывает assignSkill", async () => {
    const { result } = renderHook(() => useCompetency());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.setLevel(2, 10, 4); });
    expect(mAssign).toHaveBeenCalledWith(2, 10, 4);
    expect(mPatch).not.toHaveBeenCalled();
    expect(result.current.levels["2-10"]).toBe(4);
  });

  it("setLevel: для существующей связи вызывает patchSkillLevel", async () => {
    const { result } = renderHook(() => useCompetency());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.setLevel(1, 10, 5); });
    expect(mPatch).toHaveBeenCalledWith(1, 10, 5);
    expect(mAssign).not.toHaveBeenCalled();
    expect(result.current.levels["1-10"]).toBe(5);
  });

  it("removeSkillFromEmployee убирает уровень из карты", async () => {
    mRemove.mockResolvedValue();
    const { result } = renderHook(() => useCompetency());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.removeSkillFromEmployee(1, 10); });
    expect(mRemove).toHaveBeenCalledWith(1, 10);
    expect(result.current.levels["1-10"]).toBeUndefined();
  });

  it("сохраняет ошибку при сбое загрузки", async () => {
    mEmps.mockRejectedValue(new Error("Сервер недоступен"));
    const { result } = renderHook(() => useCompetency());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Сервер недоступен");
  });
});
