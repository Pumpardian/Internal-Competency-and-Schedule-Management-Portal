/**
 * Глобальная подготовка тестов: очистка DOM после каждого теста,
 * чтобы рендеры компонентов не пересекались между собой.
 */
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
