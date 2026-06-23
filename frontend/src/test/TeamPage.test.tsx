import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TeamPage } from "../components/TeamPage";
import { currentUser, getProfile, getRole, fetchRolePermissions } from "../api";
import type { Employee, Skill } from "../types";

// TeamPage внутри использует useAccess (ходит в api) — подменяем модуль.
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

const ivanov: Employee = { id: 1, name: "Иванов Иван", firstName: "Иван", lastName: "Иванов", position: "Разработчик" };
const python: Skill = { id: 10, name: "Python", category: "language" };

let props: React.ComponentProps<typeof TeamPage>;

function setPerms(perms: string[]) {
  mockMe.mockReturnValue({ id: 1, username: "ivanov" });
  mockProfile.mockResolvedValue(ivanov);
  mockRole.mockResolvedValue({ id: 1, name: "admin" });
  mockPerms.mockResolvedValue(perms);
}

beforeEach(() => {
  vi.clearAllMocks();
  props = {
    employees: [ivanov], skills: [python], levels: { "1-10": 3 },
    loading: false, error: null,
    onReload: vi.fn(), onSetLevel: vi.fn().mockResolvedValue(undefined),
    onAddEmployee: vi.fn(), onAddSkill: vi.fn(), onEditEmployee: vi.fn(), onRemoveEmployee: vi.fn(),
    onEditSkill: vi.fn(), onRemoveSkill: vi.fn(), onRemoveSkillFromEmployee: vi.fn(),
    onOpenEmployee: vi.fn(),
    employeePage: 1, employeeTotalPages: 1, onEmployeePage: vi.fn(),
    skillPage: 1, skillTotalPages: 1, onSkillPage: vi.fn(),
    push: vi.fn(),
  };
});

describe("TeamPage", () => {
  it("рисует матрицу: сотрудника, навык и уровень", () => {
    setPerms([]);
    const { container } = render(<TeamPage {...props} />);
    expect(screen.getByText("Иванов Иван")).toBeTruthy();
    expect(screen.getByText("Python")).toBeTruthy();
    expect(container.querySelector("td.cell .lvl")?.textContent).toBe("3");
  });

  it("клик по сотруднику открывает его профиль", () => {
    setPerms([]);
    const { container } = render(<TeamPage {...props} />);
    fireEvent.click(container.querySelector(".emp-ident--clickable")!);
    expect(props.onOpenEmployee).toHaveBeenCalledWith(1);
  });

  it("поиск фильтрует сотрудников на странице", () => {
    setPerms([]);
    render(<TeamPage {...props} />);
    fireEvent.change(screen.getByPlaceholderText("Поиск на странице…"), { target: { value: "Петров" } });
    expect(screen.queryByText("Иванов Иван")).toBeNull();
  });

  it("без права создания не показывает кнопку добавления сотрудника", () => {
    setPerms([]);
    render(<TeamPage {...props} />);
    expect(screen.queryByText("+ Добавить сотрудника")).toBeNull();
  });

  it("с правом employee.create показывает кнопку и открывает форму", async () => {
    setPerms(["employee.create"]);
    render(<TeamPage {...props} />);
    const btn = await screen.findByText("+ Добавить сотрудника");
    fireEvent.click(btn);
    expect(screen.getByText("Новый сотрудник")).toBeTruthy();
  });

  it("с правом на уровни клик по ячейке открывает поповер и сохраняет уровень", async () => {
    setPerms(["employee.create", "employee_skill.update"]);
    const { container } = render(<TeamPage {...props} />);
    await screen.findByText("+ Добавить сотрудника"); // дождались загрузки прав
    fireEvent.click(container.querySelector("td.cell")!);
    expect(await screen.findByText("Иванов Иван · Python")).toBeTruthy();
    fireEvent.change(screen.getByRole("slider"), { target: { value: "5" } });
    fireEvent.click(screen.getByText("Готово"));
    await waitFor(() => expect(props.onSetLevel).toHaveBeenCalledWith(1, 10, 5));
  });
});
