import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EntityModal, type FormField } from "./EntityModal";

const fields: FormField[] = [{ name: "name", label: "Название", value: "", required: true }];

describe("EntityModal", () => {
  it("рендерит заголовок и поля", () => {
    render(
      <EntityModal title="Новый навык" submitLabel="Добавить" fields={fields} onClose={() => {}} onSubmit={() => {}} />,
    );
    expect(screen.getByText("Новый навык")).toBeTruthy();
    expect(screen.getByText("Название")).toBeTruthy();
  });

  it("не отправляет форму при пустом обязательном поле и показывает ошибку", async () => {
    const onSubmit = vi.fn();
    render(
      <EntityModal title="t" submitLabel="Добавить" fields={fields} onClose={() => {}} onSubmit={onSubmit} />,
    );
    await userEvent.click(screen.getByText("Добавить"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/Заполните поле/)).toBeTruthy();
  });

  it("отправляет значения при заполненном поле", async () => {
    const onSubmit = vi.fn();
    render(
      <EntityModal title="t" submitLabel="Добавить" fields={fields} onClose={() => {}} onSubmit={onSubmit} />,
    );
    await userEvent.type(screen.getByRole("textbox"), "Python");
    await userEvent.click(screen.getByText("Добавить"));
    expect(onSubmit).toHaveBeenCalledWith({ name: "Python" });
  });
});
