import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmployeeCard } from "../components/EmployeeCard";
import { fetchEmployee, fetchEmployeeSkills } from "../api";
import type { Employee } from "../types";

vi.mock("../api", () => ({ fetchEmployee: vi.fn(), fetchEmployeeSkills: vi.fn() }));
const mockEmp = vi.mocked(fetchEmployee);
const mockSkills = vi.mocked(fetchEmployeeSkills);

const emp: Employee = {
  id: 5, name: "Петров Иван", firstName: "Иван", lastName: "Петров",
  position: "Разработчик", createdAt: "2025-01-02T10:00:00Z",
};

beforeEach(() => vi.clearAllMocks());

describe("EmployeeCard", () => {
  it("показывает данные сотрудника и его навыки с категориями", async () => {
    mockEmp.mockResolvedValue(emp);
    mockSkills.mockResolvedValue([{ id: 10, name: "Python", category: "language", level: 4 }]);
    render(<EmployeeCard employeeId={5} />);
    expect(await screen.findByText("Петров Иван")).toBeTruthy();
    expect(screen.getByText("Разработчик")).toBeTruthy();
    expect(screen.getByText("ID: 5")).toBeTruthy();
    expect(screen.getByText("Python")).toBeTruthy();
    expect(screen.getByText("Язык")).toBeTruthy(); // CATEGORY_LABEL[language]
  });

  it("сообщает, когда навыков нет", async () => {
    mockEmp.mockResolvedValue(emp);
    mockSkills.mockResolvedValue([]);
    render(<EmployeeCard employeeId={5} />);
    expect(await screen.findByText("У сотрудника пока нет назначенных навыков.")).toBeTruthy();
  });

  it("показывает ошибку загрузки профиля", async () => {
    mockEmp.mockRejectedValue(new Error("404"));
    mockSkills.mockResolvedValue([]);
    render(<EmployeeCard employeeId={5} />);
    expect(await screen.findByText(/Не удалось загрузить профиль/)).toBeTruthy();
  });
});
