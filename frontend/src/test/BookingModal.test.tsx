import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BookingModal } from "../components/BookingModal";
import type { Employee } from "../types";

const employees: Employee[] = [
  { id: 1, name: "Иванов Иван", firstName: "Иван", lastName: "Иванов", position: "" },
  { id: 2, name: "Петров Пётр", firstName: "Пётр", lastName: "Петров", position: "" },
];
const validInit = { startH: 10, startM: 0, endH: 11, endM: 0 };

describe("BookingModal", () => {
  it("не отправляет бронь без темы и показывает ошибку", () => {
    const onSubmit = vi.fn();
    render(<BookingModal employees={employees} date="2026-06-08" init={validInit} onClose={() => {}} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText("Сохранить"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Укажите тему встречи.")).toBeTruthy();
  });

  it("требует, чтобы окончание было позже начала", () => {
    const onSubmit = vi.fn();
    render(
      <BookingModal employees={employees} date="2026-06-08" init={{ startH: 10, startM: 0, endH: 10, endM: 0 }} onClose={() => {}} onSubmit={onSubmit} />,
    );
    fireEvent.change(screen.getByPlaceholderText(/Обсуждение спринта/), { target: { value: "Звонок" } });
    fireEvent.click(screen.getByText("Сохранить"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Время окончания должно быть позже начала.")).toBeTruthy();
  });

  it("отправляет корректную бронь с выбранным сотрудником", () => {
    const onSubmit = vi.fn();
    render(<BookingModal employees={employees} date="2026-06-08" init={validInit} onClose={() => {}} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText(/Обсуждение спринта/), { target: { value: "Демо" } });
    fireEvent.click(screen.getByText("Сохранить"));
    expect(onSubmit).toHaveBeenCalledWith({ topic: "Демо", empId: 1, startH: 10, startM: 0, endH: 11, endM: 0 });
  });

  it("при фиксированном сотруднике скрывает выбор и подставляет его id", () => {
    const onSubmit = vi.fn();
    render(
      <BookingModal employees={employees} date="2026-06-08" init={validInit} lockedEmployee={employees[1]} onClose={() => {}} onSubmit={onSubmit} />,
    );
    expect(screen.queryByRole("combobox")).toBeNull();
    expect((screen.getByDisplayValue("Петров Пётр") as HTMLInputElement).disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText(/Обсуждение спринта/), { target: { value: "Встреча" } });
    fireEvent.click(screen.getByText("Сохранить"));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ empId: 2 }));
  });

  it("клик по затемнению закрывает окно", () => {
    const onClose = vi.fn();
    const { container } = render(
      <BookingModal employees={employees} date="2026-06-08" init={validInit} onClose={onClose} onSubmit={() => {}} />,
    );
    fireEvent.click(container.querySelector(".overlay")!);
    expect(onClose).toHaveBeenCalled();
  });
});
