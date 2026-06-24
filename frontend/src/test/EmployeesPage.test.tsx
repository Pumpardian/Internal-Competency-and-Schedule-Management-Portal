import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmployeesPage } from "../components/EmployeesPage";
import { fetchEmployees, fetchEmployee, fetchEmployeeSkills } from "../api";
import type { Employee } from "../types";

vi.mock("../api", () => ({
  fetchEmployees: vi.fn(),
  fetchEmployee: vi.fn(),
  fetchEmployeeSkills: vi.fn(),
}));
const mockList = vi.mocked(fetchEmployees);
const mockOne = vi.mocked(fetchEmployee);
const mockSkills = vi.mocked(fetchEmployeeSkills);

const ivanov: Employee = { id: 1, name: "Иванов Иван", firstName: "Иван", lastName: "Иванов", position: "Разработчик" };
const petrov: Employee = { id: 2, name: "Петров Пётр", firstName: "Пётр", lastName: "Петров", position: "Аналитик" };

beforeEach(() => {
  vi.clearAllMocks();
  mockList.mockResolvedValue({ data: [ivanov, petrov], currentPage: 1, pageSize: 20, totalPages: 1 });
});

describe("EmployeesPage", () => {
  it("загружает и показывает список сотрудников", async () => {
    render(<EmployeesPage />);
    expect(await screen.findByText("Иванов Иван")).toBeTruthy();
    expect(screen.getByText("Петров Пётр")).toBeTruthy();
  });

  it("показывает кнопку экспорта в Excel", async () => {
    render(<EmployeesPage />);
    expect(await screen.findByText("Экспорт в Excel")).toBeTruthy();
  });

  it("фильтрует список по поисковой строке", async () => {
    render(<EmployeesPage />);
    await screen.findByText("Иванов Иван");
    fireEvent.change(screen.getByPlaceholderText("Поиск по имени…"), { target: { value: "Петр" } });
    expect(screen.queryByText("Иванов Иван")).toBeNull();
    expect(screen.getByText("Петров Пётр")).toBeTruthy();
  });

  it("открывает карточку сотрудника по клику", async () => {
    mockOne.mockResolvedValue(petrov);
    mockSkills.mockResolvedValue([]);
    render(<EmployeesPage />);
    fireEvent.click(await screen.findByText("Петров Пётр"));
    expect(await screen.findByText("← Назад к списку")).toBeTruthy();
    expect(mockOne).toHaveBeenCalledWith(2);
  });
});
