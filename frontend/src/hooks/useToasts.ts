/**
 * Хук всплывающих уведомлений (toast).
 *
 * Используется для вывода пользователю сообщений об успехе и ошибках,
 * включая конфликт бронирования (409 Conflict).
 */
import { useCallback, useState } from "react";
import type { Toast, ToastInput } from "../types";

/** Значение, возвращаемое хуком {@link useToasts}. */
export interface UseToasts {
  /** Текущая очередь уведомлений для отрисовки. */
  toasts: Toast[];
  /** Добавляет уведомление; оно само исчезнет через 4 секунды. */
  push: (t: ToastInput) => void;
}

/**
 * Управляет очередью самоудаляющихся уведомлений.
 * Каждое уведомление получает уникальный id и удаляется по таймеру (4 с).
 */
export function useToasts(): UseToasts {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: ToastInput) => {
    // Уникальный id: метка времени + случайная добавка (на случай совпадения мс).
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }]);
    // Автоудаление уведомления через 4 секунды.
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
  }, []);

  return { toasts, push };
}
