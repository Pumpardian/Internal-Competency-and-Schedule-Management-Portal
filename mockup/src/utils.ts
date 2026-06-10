/**
 * Вспомогательные функции работы со временем для подсистемы бронирования.
 */
import type { TimeRange } from "./types";

/**
 * Форматирует часы и минуты в строку «HH:MM» с ведущими нулями.
 * @param h часы
 * @param m минуты
 */
export function fmt(h: number, m: number): string {
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

/**
 * Переводит время «часы:минуты» в число минут от начала суток —
 * удобно для сравнения интервалов.
 */
export function toMin(h: number, m: number): number {
  return h * 60 + m;
}

/**
 * Проверяет пересечение двух временных интервалов.
 *
 * Условие пересечения: `start_time < new_end AND end_time > new_start`.
 * Используется серверной заглушкой для отклонения брони с кодом 409 Conflict.
 *
 * @returns `true`, если интервалы накладываются друг на друга.
 */
export function overlaps(a: TimeRange, b: TimeRange): boolean {
  return (
    toMin(a.startH, a.startM) < toMin(b.endH, b.endM) &&
    toMin(a.endH, a.endM) > toMin(b.startH, b.startM)
  );
}
