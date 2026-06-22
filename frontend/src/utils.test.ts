import { describe, it, expect } from "vitest";
import { fmt, toMin, overlaps } from "./utils";

describe("fmt", () => {
  it("форматирует время с ведущими нулями", () => {
    expect(fmt(9, 0)).toBe("09:00");
    expect(fmt(14, 30)).toBe("14:30");
  });
});

describe("toMin", () => {
  it("переводит часы:минуты в минуты от начала суток", () => {
    expect(toMin(0, 0)).toBe(0);
    expect(toMin(1, 30)).toBe(90);
    expect(toMin(18, 0)).toBe(1080);
  });
});

describe("overlaps", () => {
  const a = { startH: 10, startM: 0, endH: 11, endM: 0 };

  it("находит пересечение интервалов", () => {
    expect(overlaps(a, { startH: 10, startM: 30, endH: 11, endM: 30 })).toBe(true);
  });

  it("не считает пересечением смежные интервалы (конец = начало)", () => {
    expect(overlaps(a, { startH: 11, startM: 0, endH: 12, endM: 0 })).toBe(false);
  });

  it("не считает пересечением непересекающиеся интервалы", () => {
    expect(overlaps(a, { startH: 12, startM: 0, endH: 13, endM: 0 })).toBe(false);
  });
});
