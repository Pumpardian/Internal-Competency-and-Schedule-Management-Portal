import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginPage } from "../components/LoginPage";
import { login } from "../api";

vi.mock("../api", () => ({ login: vi.fn() }));
const mockLogin = vi.mocked(login);

beforeEach(() => vi.clearAllMocks());

describe("LoginPage", () => {
  it("отправляет логин/пароль и сообщает об успехе", async () => {
    mockLogin.mockResolvedValue();
    const onSuccess = vi.fn();
    render(<LoginPage onSuccess={onSuccess} />);
    fireEvent.change(screen.getByPlaceholderText("Введите логин"), { target: { value: "ivanov" } });
    fireEvent.change(screen.getByPlaceholderText("Введите пароль"), { target: { value: "secret" } });
    fireEvent.click(screen.getByText("Войти"));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(mockLogin).toHaveBeenCalledWith("ivanov", "secret");
  });

  it("показывает текст ошибки при неудачном входе", async () => {
    mockLogin.mockRejectedValue(new Error("Неверный логин или пароль"));
    render(<LoginPage onSuccess={() => {}} />);
    fireEvent.click(screen.getByText("Войти"));
    expect(await screen.findByText("Неверный логин или пароль")).toBeTruthy();
  });

  it("ссылка ведёт на регистрацию", () => {
    const onRegister = vi.fn();
    render(<LoginPage onRegister={onRegister} />);
    fireEvent.click(screen.getByText(/Зарегистрироваться/));
    expect(onRegister).toHaveBeenCalled();
  });
});
