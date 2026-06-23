import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Toasts } from "./Toasts";
import type { Toast } from "../types";

describe("Toasts", () => {
  it("ничего не отрисовывает при пустой очереди", () => {
    const { container } = render(<Toasts toasts={[]} />);
    expect(container.querySelectorAll(".toast")).toHaveLength(0);
  });

  it("показывает заголовок и текст каждого уведомления", () => {
    const toasts: Toast[] = [
      { id: 1, title: "Готово", msg: "Бронь создана" },
      { id: 2, title: "Ошибка", msg: "Время занято", type: "error" },
    ];
    render(<Toasts toasts={toasts} />);
    expect(screen.getByText("Готово")).toBeTruthy();
    expect(screen.getByText("Бронь создана")).toBeTruthy();
    expect(screen.getByText("Время занято")).toBeTruthy();
  });

  it("помечает уведомления-ошибки классом error", () => {
    const toasts: Toast[] = [
      { id: 1, title: "Ок", msg: "обычное" },
      { id: 2, title: "Сбой", msg: "ошибка", type: "error" },
    ];
    const { container } = render(<Toasts toasts={toasts} />);
    const errorToasts = container.querySelectorAll(".toast.error");
    expect(errorToasts).toHaveLength(1);
    expect(container.querySelectorAll(".toast")).toHaveLength(2);
  });
});
