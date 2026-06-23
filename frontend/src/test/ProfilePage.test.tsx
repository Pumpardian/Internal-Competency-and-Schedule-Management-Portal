import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfilePage } from "../components/ProfilePage";
import { currentUser, getProfile, fetchEmployee, fetchEmployeeSkills } from "../api";
import type { Employee } from "../types";

vi.mock("../api", () => ({
  currentUser: vi.fn(),
  getProfile: vi.fn(),
  fetchEmployee: vi.fn(),
  fetchEmployeeSkills: vi.fn(),
}));
const mockMe = vi.mocked(currentUser);
const mockProfile = vi.mocked(getProfile);
const mockOne = vi.mocked(fetchEmployee);
const mockSkills = vi.mocked(fetchEmployeeSkills);

const emp: Employee = { id: 5, name: "Петров Иван", firstName: "Иван", lastName: "Петров", position: "Разработчик" };

beforeEach(() => vi.clearAllMocks());

describe("ProfilePage", () => {
  it("показывает карточку профиля текущего пользователя", async () => {
    mockMe.mockReturnValue({ id: 1, username: "ivanov" });
    mockProfile.mockResolvedValue(emp);
    mockOne.mockResolvedValue(emp);
    mockSkills.mockResolvedValue([]);
    render(<ProfilePage />);
    expect(await screen.findByText("Петров Иван")).toBeTruthy();
    expect(mockProfile).toHaveBeenCalledWith(1);
  });

  it("сообщает, если к аккаунту не привязан сотрудник", async () => {
    mockMe.mockReturnValue({ id: 1, username: "ivanov" });
    mockProfile.mockResolvedValue(null);
    render(<ProfilePage />);
    expect(await screen.findByText("К вашему аккаунту не привязан профиль сотрудника.")).toBeTruthy();
  });
});
