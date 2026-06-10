/**
 * Страница «Переговорная» (подсистема «Бронирование переговорной»).
 *
 * Показывает календарь рабочего дня с занятыми слотами. Клик по свободному часу
 * открывает модалку создания брони. Перед добавлением выполняется проверка
 * пересечения интервалов; конфликт отклоняется уведомлением «409 Conflict»
 * (имитация серверной логики).
 */
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { CAL_END, CAL_START, HOUR_PX } from "../data";
import type { Booking, BookingDraft, Employee, TimeRange, ToastInput } from "../types";
import { fmt, overlaps } from "../utils";
import { BookingModal } from "./BookingModal";

interface RoomPageProps {
  /** Справочник сотрудников (организаторы броней). */
  employees: Employee[];
  /** Текущий список броней. */
  bookings: Booking[];
  /** Сеттер списка броней. */
  setBookings: Dispatch<SetStateAction<Booking[]>>;
  /** Показ всплывающего уведомления. */
  push: (t: ToastInput) => void;
}

/** Страница календаря броней переговорной. */
export function RoomPage({ employees, bookings, setBookings, push }: RoomPageProps) {
  // Просматриваемый день (YYYY-MM-DD).
  const [date, setDate] = useState("2026-06-08");
  // Интервал, для которого открыта модалка создания (или null).
  const [modal, setModal] = useState<TimeRange | null>(null);

  /** Сдвинуть просматриваемую дату на delta дней. */
  const shiftDate = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  /**
   * Создать бронь с имитацией серверной проверки конфликтов.
   * @returns true — бронь создана; false — отклонена из-за пересечения (409).
   */
  const createBooking = (data: BookingDraft): boolean => {
    // Серверная логика (имитация): ищем пересечение с существующими бронями.
    const conflict = bookings.find((b) => overlaps(b, data));
    if (conflict) {
      push({
        type: "error",
        title: "409 Conflict",
        msg: "Интервал пересекается с бронью «" + conflict.topic + "».",
      });
      return false;
    }
    // Новый id = максимальный существующий + 1.
    const id = Math.max(0, ...bookings.map((b) => b.id)) + 1;
    setBookings((prev) => [...prev, { ...data, id }]);
    push({ title: "Бронь создана", msg: data.topic + " · 201 Created" });
    return true;
  };

  // Часы сетки календаря: [CAL_START, CAL_END).
  const hours: number[] = [];
  for (let h = CAL_START; h < CAL_END; h++) hours.push(h);

  return (
    <div className="page">
      <h1>Переговорная</h1>
      <p className="subtitle">
        Календарный вид дня. Клик по свободному промежутку создаёт бронь. Конфликты времени
        отклоняются.
      </p>

      {/* Переключение дня; подсказка эндпоинта GET /bookings?date=. */}
      <div className="daybar">
        <button className="btn" onClick={() => shiftDate(-1)}>
          ◀
        </button>
        <span className="date">{date}</span>
        <button className="btn" onClick={() => shiftDate(1)}>
          ▶
        </button>
        <span className="api-hint">GET /bookings?date={date}</span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="calendar">
          {/* Сетка часов: клик по строке открывает модалку на этот час. */}
          {hours.map((h) => (
            <div className="cal-row" key={h}>
              <div className="cal-time">{String(h).padStart(2, "0")}:00</div>
              <div
                className="cal-track"
                onClick={() => setModal({ startH: h, startM: 0, endH: h + 1, endM: 0 })}
              >
                <div className="slot-hit" />
              </div>
            </div>
          ))}

          {/* Слой событий поверх сетки (абсолютное позиционирование по времени). */}
          <div
            style={{ position: "absolute", top: 0, left: 64, right: 0, bottom: 0, pointerEvents: "none" }}
          >
            {bookings.map((b) => {
              // Положение и высота блока вычисляются из времени брони.
              const top = (b.startH + b.startM / 60 - CAL_START) * HOUR_PX;
              const height = (b.endH + b.endM / 60 - b.startH - b.startM / 60) * HOUR_PX;
              const emp = employees.find((e) => e.id === b.empId);
              // Цвет блока зависит от чётности id сотрудника (просто для различимости).
              const color = b.empId % 2 ? "#1677ff" : "#52c41a";
              return (
                <div
                  key={b.id}
                  className="event"
                  style={{ top, height, background: color, pointerEvents: "auto" }}
                >
                  {/* Кнопка отмены брони (DELETE /bookings/{id}). */}
                  <span
                    className="ev-del"
                    title="Отменить (DELETE /bookings/{id})"
                    onClick={() => {
                      setBookings((prev) => prev.filter((x) => x.id !== b.id));
                      push({ title: "Бронь отменена", msg: b.topic });
                    }}
                  >
                    ×
                  </span>
                  <div className="ev-title">{b.topic}</div>
                  <div className="ev-meta">
                    {fmt(b.startH, b.startM)} – {fmt(b.endH, b.endM)} · {emp ? emp.name : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Модалка создания брони; при успехе закрывается. */}
      {modal && (
        <BookingModal
          employees={employees}
          date={date}
          init={modal}
          onClose={() => setModal(null)}
          onSubmit={(data) => {
            const ok = createBooking(data);
            if (ok) setModal(null);
          }}
        />
      )}
    </div>
  );
}
