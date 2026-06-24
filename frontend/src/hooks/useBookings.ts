/**
 * Загрузка и изменение броней переговорной через REST API бэкенда.
 *
 * Брони привязаны к просматриваемому дню: при смене даты список перезагружается.
 * Создание и удаление сразу отражаются в локальном состоянии после ответа
 * сервера. Проверку пересечений по времени делает бэкенд (ответ 409).
 */
import { useCallback, useEffect, useState } from "react";
import { createBooking, deleteBooking, fetchBookings, updateBooking } from "../api";
import type { Booking, BookingDraft } from "../types";

export interface UseBookings {
  /** Брони за выбранный день. */
  bookings: Booking[];
  loading: boolean;
  /** Текст последней ошибки загрузки (или null). */
  error: string | null;
  /** Перезагрузить брони текущего дня. */
  reload: () => Promise<void>;
  /** Создать бронь (бросает ошибку при конфликте времени — 409). */
  addBooking: (draft: BookingDraft) => Promise<void>;
  /** Изменить бронь (бросает ошибку при конфликте времени — 409). */
  editBooking: (id: number, draft: BookingDraft) => Promise<void>;
  /** Удалить бронь. */
  removeBooking: (id: number) => Promise<void>;
}

export function useBookings(date: string): UseBookings {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBookings(await fetchBookings(date));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addBooking = useCallback(
    async (draft: BookingDraft) => {
      const created = await createBooking(date, draft);
      setBookings((prev) => [...prev, created]);
    },
    [date],
  );

  const editBooking = useCallback(
    async (id: number, draft: BookingDraft) => {
      const updated = await updateBooking(id, date, draft);
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    },
    [date],
  );

  const removeBooking = useCallback(async (id: number) => {
    await deleteBooking(id);
    setBookings((prev) => prev.filter((b) => b.id !== id));
  }, []);

  return { bookings, loading, error, reload, addBooking, editBooking, removeBooking };
}
