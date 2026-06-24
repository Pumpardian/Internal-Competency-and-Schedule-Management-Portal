import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RegisterPage } from "../components/RegisterPage";
import { register } from "../api";

vi.mock("../api", () => ({ register: vi.fn() }));
const mockRegister = vi.mocked(register);

// Пароль, проходящий проверку сложности (8+, заглавная, строчная, цифра, спецсимвол).
const STRONG = "Passw0rd!";

beforeEach(() => vi.clearAllMocks());

describe("RegisterPage", () => {
  it("без имени/фамилии регистрирует без данных сотрудника", async () => {
    mockRegister.mockResolvedValue();
    const onSuccess = vi.fn();
    render(<RegisterPage onSuccess={onSuccess} />);
    fireEvent.change(screen.getByPlaceholderText("Придумайте логин"), { target: { value: "new" } });
    fireEvent.change(screen.getByPlaceholderText("Придумайте пароль"), { target: { value: STRONG } });
    fireEvent.click(screen.getByText("Зарегистрироваться"));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(mockRegister).toHaveBeenCalledWith("new", STRONG, undefined, null);
  });

  it("с именем и фамилией передаёт данные сотрудника", async () => {
    mockRegister.mockResolvedValue();
    render(<RegisterPage onSuccess={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("Придумайте логин"), { target: { value: "new" } });
    fireEvent.change(screen.getByPlaceholderText("Придумайте пароль"), { target: { value: STRONG } });
    fireEvent.change(screen.getByPlaceholderText("Имя сотрудника"), { target: { value: "Иван" } });
    fireEvent.change(screen.getByPlaceholderText("Фамилия сотрудника"), { target: { value: "Петров" } });
    fireEvent.click(screen.getByText("Зарегистрироваться"));
    await waitFor(() => expect(mockRegister).toHaveBeenCalled());
    expect(mockRegister).toHaveBeenCalledWith(
      "new", STRONG,
      { first_name: "Иван", last_name: "Петров", position: undefined },
      null,
    );
  });

  it("не отправляет форму со слабым паролем и показывает требования", () => {
    render(<RegisterPage onSuccess={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("Придумайте логин"), { target: { value: "new" } });
    fireEvent.change(screen.getByPlaceholderText("Придумайте пароль"), { target: { value: "pass" } });
    fireEvent.click(screen.getByText("Зарегистрироваться"));
    expect(mockRegister).not.toHaveBeenCalled();
    expect(screen.getByText("Пароль не отвечает требованиям сложности.")).toBeTruthy();
    // чек-лист требований виден
    expect(screen.getByText("Минимум 8 символов")).toBeTruthy();
  });

  it("показывает ошибку регистрации", async () => {
    mockRegister.mockRejectedValue(new Error("Логин занят"));
    render(<RegisterPage onSuccess={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("Придумайте логин"), { target: { value: "new" } });
    fireEvent.change(screen.getByPlaceholderText("Придумайте пароль"), { target: { value: STRONG } });
    fireEvent.click(screen.getByText("Зарегистрироваться"));
    expect(await screen.findByText("Логин занят")).toBeTruthy();
  });
});
