import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Header } from "../components/Header";

describe("Header", () => {
  it("показывает логин и помечает активную страницу", () => {
    render(<Header page="room" setPage={() => {}} username="ivanov" onLogout={() => {}} />);
    expect(screen.getByText("ivanov")).toBeTruthy();
    expect(screen.getByText("Переговорная").className).toContain("active");
    expect(screen.getByText("Команда и навыки").className).not.toContain("active");
  });

  it("переключает страницу по клику", () => {
    const setPage = vi.fn();
    render(<Header page="team" setPage={setPage} username="u" onLogout={() => {}} />);
    fireEvent.click(screen.getByText("Сотрудники"));
    expect(setPage).toHaveBeenCalledWith("employees");
    fireEvent.click(screen.getByText("Аккаунт"));
    expect(setPage).toHaveBeenCalledWith("account");
  });

  it("кнопка «Выйти» вызывает onLogout", () => {
    const onLogout = vi.fn();
    render(<Header page="team" setPage={() => {}} username="u" onLogout={onLogout} />);
    fireEvent.click(screen.getByText("Выйти"));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
