import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
    // Категория навыка показывается в его бейдже (в селекте «Тип навыка» «Язык» тоже есть).
    expect(document.querySelector(".profile-skill .badge")?.textContent).toBe("Язык");
  });

  it("сообщает, когда навыков нет", async () => {
    mockEmp.mockResolvedValue(emp);
    mockSkills.mockResolvedValue([]);
    render(<EmployeeCard employeeId={5} />);
    expect(await screen.findByText("У сотрудника пока нет назначенных навыков.")).toBeTruthy();
  });

  it("сортирует навыки по выбранному критерию", async () => {
    mockEmp.mockResolvedValue(emp);
    mockSkills.mockResolvedValue([
      { id: 1, name: "Python", category: "language", level: 2 },
      { id: 2, name: "Docker", category: "tool", level: 5 },
      { id: 3, name: "SQL", category: "database", level: 3 },
    ]);
    render(<EmployeeCard employeeId={5} />);
    await screen.findByText("Python");
    const names = () =>
      Array.from(document.querySelectorAll(".profile-skill-name")).map((e) => e.textContent);

    // по умолчанию — уровень по убыванию: Docker(5), SQL(3), Python(2)
    expect(names()).toEqual(["Docker", "SQL", "Python"]);

    fireEvent.change(screen.getByLabelText("Сортировка навыков"), { target: { value: "name-az" } });
    expect(names()).toEqual(["Docker", "Python", "SQL"]);

    fireEvent.change(screen.getByLabelText("Сортировка навыков"), { target: { value: "level-asc" } });
    expect(names()).toEqual(["Python", "SQL", "Docker"]);
  });

  it("фильтрует навыки по выбранному типу", async () => {
    mockEmp.mockResolvedValue(emp);
    mockSkills.mockResolvedValue([
      { id: 1, name: "Python", category: "language", level: 2 },
      { id: 2, name: "Docker", category: "tool", level: 5 },
      { id: 3, name: "React", category: "framework", level: 4 },
    ]);
    render(<EmployeeCard employeeId={5} />);
    await screen.findByText("Python");

    fireEvent.change(screen.getByLabelText("Тип навыка"), { target: { value: "framework" } });
    const names = Array.from(document.querySelectorAll(".profile-skill-name")).map((e) => e.textContent);
    expect(names).toEqual(["React"]);

    // тип, которого у сотрудника нет → сообщение
    fireEvent.change(screen.getByLabelText("Тип навыка"), { target: { value: "database" } });
    expect(screen.getByText("Навыков выбранного типа нет.")).toBeTruthy();
  });

  it("показывает ошибку загрузки профиля", async () => {
    mockEmp.mockRejectedValue(new Error("404"));
    mockSkills.mockResolvedValue([]);
    render(<EmployeeCard employeeId={5} />);
    expect(await screen.findByText(/Не удалось загрузить профиль/)).toBeTruthy();
  });
});
