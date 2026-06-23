import { describe, it, expect } from "vitest";
import { HEAT, HEAT_TEXT, SKILL_CATEGORIES, CATEGORY_LABEL } from "./data";

describe("HEAT / HEAT_TEXT", () => {
  it("покрывают все уровни владения 0..5 (по 6 цветов)", () => {
    expect(HEAT).toHaveLength(6);
    expect(HEAT_TEXT).toHaveLength(6);
  });

  it("значения — валидные HEX-цвета", () => {
    for (const color of [...HEAT, ...HEAT_TEXT]) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe("CATEGORY_LABEL", () => {
  it("сопоставляет каждое значение категории её русской подписи", () => {
    expect(CATEGORY_LABEL.language).toBe("Язык");
    expect(CATEGORY_LABEL.database).toBe("СУБД");
    expect(CATEGORY_LABEL.other).toBe("Другое");
  });

  it("построен ровно из SKILL_CATEGORIES (ключи и подписи совпадают)", () => {
    expect(Object.keys(CATEGORY_LABEL)).toHaveLength(SKILL_CATEGORIES.length);
    for (const c of SKILL_CATEGORIES) {
      expect(CATEGORY_LABEL[c.value]).toBe(c.label);
    }
  });

  it("возвращает undefined для неизвестной категории", () => {
    expect(CATEGORY_LABEL["неизвестная"]).toBeUndefined();
  });
});
