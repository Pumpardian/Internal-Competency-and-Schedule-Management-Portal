import { describe, it, expect } from "vitest";
import { employeeRows } from "../exportEmployees";
import type { Employee } from "../types";

describe("employeeRows", () => {
  it("маппит сотрудников в строки выгрузки (ID/Фамилия/Имя/Должность)", () => {
    const emps: Employee[] = [
      { id: 1, name: "Иванов Иван", firstName: "Иван", lastName: "Иванов", position: "Разработчик" },
      { id: 2, name: "Петров Пётр", firstName: "Пётр", lastName: "Петров", position: "" },
    ];
    expect(employeeRows(emps)).toEqual([
      { ID: 1, Фамилия: "Иванов", Имя: "Иван", Должность: "Разработчик" },
      { ID: 2, Фамилия: "Петров", Имя: "Пётр", Должность: "" },
    ]);
  });

  it("пустой список даёт пустой набор строк", () => {
    expect(employeeRows([])).toEqual([]);
  });
});
