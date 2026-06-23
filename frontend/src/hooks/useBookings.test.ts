import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useBookings } from "./useBookings";
import { fetchBookings, createBooking, deleteBooking } from "../api";
import type { Booking } from "../types";

// Хук ходит в REST API — подменяем модуль, чтобы тестировать только его логику.
vi.mock("../api", () => ({
  fetchBookings: vi.fn(),
  createBooking: vi.fn(),
  deleteBooking: vi.fn(),
}));

const mockFetch = vi.mocked(fetchBookings);
const mockCreate = vi.mocked(createBooking);
const mockDelete = vi.mocked(deleteBooking);

const b1: Booking = { id: 1, topic: "Планёрка", empId: 1, startH: 9, startM: 0, endH: 10, endM: 0 };

beforeEach(() => vi.clearAllMocks());

describe("useBookings", () => {
  it("загружает брони выбранного дня при монтировании", async () => {
    mockFetch.mockResolvedValue([b1]);
    const { result } = renderHook(() => useBookings("2026-01-15"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFetch).toHaveBeenCalledWith("2026-01-15");
    expect(result.current.bookings).toEqual([b1]);
    expect(result.current.error).toBeNull();
  });

  it("addBooking добавляет созданную бронь в состояние", async () => {
    mockFetch.mockResolvedValue([]);
    const created: Booking = { id: 2, topic: "Демо", empId: 3, startH: 11, startM: 0, endH: 12, endM: 0 };
    mockCreate.mockResolvedValue(created);
    const { result } = renderHook(() => useBookings("2026-01-15"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addBooking({ topic: "Демо", empId: 3, startH: 11, startM: 0, endH: 12, endM: 0 });
    });
    expect(mockCreate).toHaveBeenCalledWith("2026-01-15", expect.objectContaining({ topic: "Демо" }));
    expect(result.current.bookings).toEqual([created]);
  });

  it("removeBooking убирает бронь по id", async () => {
    mockFetch.mockResolvedValue([b1]);
    mockDelete.mockResolvedValue();
    const { result } = renderHook(() => useBookings("2026-01-15"));
    await waitFor(() => expect(result.current.bookings).toHaveLength(1));

    await act(async () => {
      await result.current.removeBooking(1);
    });
    expect(mockDelete).toHaveBeenCalledWith(1);
    expect(result.current.bookings).toEqual([]);
  });

  it("сохраняет текст ошибки при сбое загрузки", async () => {
    mockFetch.mockRejectedValue(new Error("Сервер недоступен"));
    const { result } = renderHook(() => useBookings("2026-01-15"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Сервер недоступен");
    expect(result.current.bookings).toEqual([]);
  });

  it("перезагружает брони при смене даты", async () => {
    mockFetch.mockResolvedValue([]);
    const { rerender } = renderHook(({ date }) => useBookings(date), {
      initialProps: { date: "2026-01-15" },
    });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("2026-01-15"));
    rerender({ date: "2026-01-16" });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("2026-01-16"));
  });
});
