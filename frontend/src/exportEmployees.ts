/**
 * Выгрузка справочника сотрудников в файл Excel (.xlsx) через SheetJS.
 *
 * Подготовка строк вынесена в чистую функцию {@link employeeRows} — её удобно
 * тестировать без обращения к файловой системе/браузеру.
 */
import * as XLSX from "xlsx";
import type { Employee } from "./types";

/** Строка выгрузки: колонки в порядке заголовков. */
export interface EmployeeRow {
  ID: number;
  Фамилия: string;
  Имя: string;
  Должность: string;
}

/** Готовит строки для Excel из списка сотрудников. */
export function employeeRows(employees: Employee[]): EmployeeRow[] {
  return employees.map((e) => ({
    ID: e.id,
    Фамилия: e.lastName,
    Имя: e.firstName,
    Должность: e.position || "",
  }));
}

/** Формирует и скачивает .xlsx со списком сотрудников. */
export function exportEmployeesToExcel(employees: Employee[], filename = "employees.xlsx"): void {
  const worksheet = XLSX.utils.json_to_sheet(employeeRows(employees));
  // Чуть шире колонки, чтобы ФИО/должности не обрезались.
  worksheet["!cols"] = [{ wch: 6 }, { wch: 22 }, { wch: 18 }, { wch: 28 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Сотрудники");
  XLSX.writeFile(workbook, filename);
}
