import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LevelPopover } from "../components/LevelPopover";
import type { Employee, Skill } from "../types";

const emp: Employee = { id: 1, name: "Иванов Иван", firstName: "Иван", lastName: "Иванов", position: "" };
const skill: Skill = { id: 2, name: "Python", category: "language" };

describe("LevelPopover", () => {
  it("показывает сотрудника, навык и текущий уровень", () => {
    render(<LevelPopover emp={emp} skill={skill} value={3} onClose={() => {}} />);
    expect(screen.getByText("Иванов Иван · Python")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect((screen.getByRole("slider") as HTMLInputElement).value).toBe("3");
  });

  it("кнопка «Готово» закрывает поповер с текущим значением", () => {
    const onClose = vi.fn();
    render(<LevelPopover emp={emp} skill={skill} value={2} onClose={onClose} />);
    fireEvent.click(screen.getByText("Готово"));
    expect(onClose).toHaveBeenCalledWith(2);
  });

  it("перемещение ползунка вызывает onChange и обновляет подтверждаемое значение", () => {
    const onChange = vi.fn();
    const onClose = vi.fn();
    render(<LevelPopover emp={emp} skill={skill} value={1} onChange={onChange} onClose={onClose} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "5" } });
    expect(onChange).toHaveBeenCalledWith(5);
    expect(screen.getByText("5")).toBeTruthy();
    fireEvent.click(screen.getByText("Готово"));
    expect(onClose).toHaveBeenCalledWith(5);
  });

  it("кнопка «Снять навык» видна и вызывает onRemove при canRemove", () => {
    const onRemove = vi.fn();
    render(
      <LevelPopover emp={emp} skill={skill} value={4} onClose={() => {}} canRemove onRemove={onRemove} />,
    );
    fireEvent.click(screen.getByText("Снять навык"));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("без canRemove кнопки снятия навыка нет", () => {
    render(<LevelPopover emp={emp} skill={skill} value={4} onClose={() => {}} onRemove={() => {}} />);
    expect(screen.queryByText("Снять навык")).toBeNull();
  });
});
