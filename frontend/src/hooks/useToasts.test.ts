import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useToasts } from "./useToasts";

describe("useToasts", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("изначально очередь пуста", () => {
    const { result } = renderHook(() => useToasts());
    expect(result.current.toasts).toEqual([]);
  });

  it("push добавляет уведомление с уникальным id", () => {
    const { result } = renderHook(() => useToasts());
    act(() => result.current.push({ title: "Готово", msg: "Сохранено" }));
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({ title: "Готово", msg: "Сохранено" });
    expect(typeof result.current.toasts[0].id).toBe("number");
  });

  it("несколько push накапливаются в очереди", () => {
    const { result } = renderHook(() => useToasts());
    act(() => {
      result.current.push({ title: "1", msg: "a" });
      result.current.push({ title: "2", msg: "b", type: "error" });
    });
    expect(result.current.toasts).toHaveLength(2);
    expect(result.current.toasts[1].type).toBe("error");
  });

  it("уведомление само удаляется через 4 секунды", () => {
    const { result } = renderHook(() => useToasts());
    act(() => result.current.push({ title: "t", msg: "m" }));
    expect(result.current.toasts).toHaveLength(1);
    act(() => vi.advanceTimersByTime(4000));
    expect(result.current.toasts).toHaveLength(0);
  });
});
