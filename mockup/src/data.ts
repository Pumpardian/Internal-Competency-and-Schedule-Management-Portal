/**
 * Тестовые («заглушечные») данные и константы макета.
 *
 * На Этапе 1 данные статичны и не связаны с БД. На этапах 3–4 эти заглушки
 * будут заменены ответами REST API.
 */
import type { Booking, Employee, Levels, Skill } from "./types";

/** Начальный справочник сотрудников. */
export const INITIAL_EMPLOYEES: Employee[] = [
  { id: 1, name: "Иванов И.И.", position: "инженер-программист" },
  { id: 2, name: "Петрова А.С.", position: "аналитик" },
  { id: 3, name: "Сидоров П.К.", position: "DevOps-инженер" },
  { id: 4, name: "Кузнецова М.В.", position: "frontend-разработчик" },
];

/** Начальный справочник навыков. */
export const INITIAL_SKILLS: Skill[] = [
  { id: 1, name: "Python", category: "язык" },
  { id: 2, name: "React", category: "инструмент" },
  { id: 3, name: "PostgreSQL", category: "СУБД" },
  { id: 4, name: "Docker", category: "инструмент" },
  { id: 5, name: "TypeScript", category: "язык" },
];

/** Начальные уровни владения (ключ `${empId}-${skillId}` -> 0..5). */
export const INITIAL_LEVELS: Levels = {
  "1-1": 5, "1-2": 2, "1-3": 4, "1-4": 3, "1-5": 1,
  "2-1": 3, "2-2": 0, "2-3": 5, "2-4": 2, "2-5": 4,
  "3-1": 4, "3-2": 1, "3-3": 3, "3-4": 5, "3-5": 0,
  "4-1": 1, "4-2": 5, "4-3": 2, "4-4": 2, "4-5": 5,
};

/** Цвета фона ячеек тепловой карты по уровню владения (индекс 0..5). */
export const HEAT = ["#ffffff", "#edf8e9", "#c7e9c0", "#74c476", "#41ab5d", "#006d2c"];

/** Цвета текста для контраста на фоне HEAT (индекс соответствует уровню). */
export const HEAT_TEXT = ["#bbbbbb", "#1f1f1f", "#1f1f1f", "#ffffff", "#ffffff", "#ffffff"];

/** Начальный список броней переговорной. */
export const INITIAL_BOOKINGS: Booking[] = [
  { id: 1, topic: "Планёрка", empId: 1, startH: 9, startM: 0, endH: 10, endM: 0 },
  { id: 2, topic: "Демо проекта", empId: 2, startH: 11, startM: 0, endH: 12, endM: 30 },
];

/** Час начала рабочего дня в календаре переговорной. */
export const CAL_START = 9;
/** Час окончания рабочего дня в календаре переговорной. */
export const CAL_END = 18;
/** Высота одного часа сетки календаря в пикселях. */
export const HOUR_PX = 60;
