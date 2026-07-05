/**
 * Константы интерфейса и заглушечные данные для подсистем без бэкенда.
 *
 * Матрица компетенций (сотрудники, навыки, уровни) теперь приходит с сервера
 * через REST API (см. useCompetency / api.ts). Здесь остаются цвета тепловой
 * карты, параметры календаря и заглушечные брони — эндпоинтов бронирования на
 * бэкенде пока нет, поэтому страница «Переговорная» работает на локальных данных.
 */
import type { Booking } from "./types";

/** Цвета фона ячеек тепловой карты по уровню владения (индекс 0..5).
 *  Значения — ссылки на CSS-переменные, поэтому палитра автоматически
 *  меняется вместе с темой (светлая/тёмная), без белых клеток в тёмной. */
export const HEAT = [
  "var(--heat-0)",
  "var(--heat-1)",
  "var(--heat-2)",
  "var(--heat-3)",
  "var(--heat-4)",
  "var(--heat-5)",
];

/** Цвета текста для контраста на фоне HEAT (индекс соответствует уровню). */
export const HEAT_TEXT = [
  "var(--heat-text-0)",
  "var(--heat-text-1)",
  "var(--heat-text-2)",
  "var(--heat-text-3)",
  "var(--heat-text-4)",
  "var(--heat-text-5)",
];

/** Палитра цветов броней переговорной. Брони одного дня раскрашиваются по
 *  порядку (первая — BOOKING_COLORS[0], вторая — [1] и т.д.), чтобы соседние
 *  не сливались; между разными днями цвета могут повторяться. */
export const BOOKING_COLORS = [
  "#1677ff", "#52c41a", "#722ed1", "#fa8c16",
  "#eb2f96", "#13c2c2", "#fa541c", "#2f54eb",
];

/** Категории навыков: значение для бэкенда (англ., см. models.skill_categories)
 *  и русская подпись для интерфейса. */
export const SKILL_CATEGORIES: { value: string; label: string }[] = [
  { value: "language", label: "Язык" },
  { value: "database", label: "СУБД" },
  { value: "framework", label: "Фреймворк" },
  { value: "library", label: "Библиотека" },
  { value: "tool", label: "Инструмент" },
  { value: "other", label: "Другое" },
];

/** Английское значение категории → русская подпись. */
export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  SKILL_CATEGORIES.map((c) => [c.value, c.label]),
);

/** Начальный список броней переговорной (заглушка). */
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
