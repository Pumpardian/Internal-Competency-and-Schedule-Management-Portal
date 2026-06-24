/**
 * Страница «Переговорная» (подсистема «Бронирование переговорной»).
 *
 * Показывает календарь рабочего дня с занятыми слотами. Данные приходят с
 * бэкенда (брони за выбранный день). Клик по свободному часу открывает модалку
 * создания; проверку пересечения интервалов делает сервер (ответ 409).
 */
import { useState } from "react";
import { CAL_END, CAL_START, HOUR_PX } from "../data";
import { useAccess } from "../hooks/useAccess";
import { useBookings } from "../hooks/useBookings";
import { useT } from "../i18n";
import type { Booking, BookingDraft, Employee, TimeRange, ToastInput } from "../types";
import { fmt } from "../utils";
import { BookingModal } from "./BookingModal";

interface RoomPageProps {
  /** Справочник сотрудников (организаторы броней). */
  employees: Employee[];
  /** Показ всплывающего уведомления. */
  push: (t: ToastInput) => void;
}

/** Извлекает текст ошибки из произвольного исключения. */
function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Страница календаря броней переговорной. */
export function RoomPage({ employees, push }: RoomPageProps) {
  // Просматриваемый день (YYYY-MM-DD).
  const [date, setDate] = useState("2026-06-08");
  // Интервал, для которого открыта модалка создания (или null).
  const [modal, setModal] = useState<TimeRange | null>(null);
  // Бронь, открытая на редактирование (или null).
  const [editing, setEditing] = useState<Booking | null>(null);
  // Брони текущего дня с бэкенда.
  const { bookings, loading, error, reload, addBooking, editBooking, removeBooking } = useBookings(date);
  // Профиль и права текущего пользователя (бронь за других — по праву booking.create).
  const { employee, can } = useAccess();
  const { t } = useT();
  const canBookOthers = can("booking.create");
  const canDeleteOthers = can("booking.delete");
  const canEditOthers = can("booking.update");

  /** Открыть модалку создания, проверив, что бронировать вообще можно. */
  const openSlot = (range: TimeRange) => {
    if (!canBookOthers && !employee) {
      push({
        type: "error",
        title: "Недоступно",
        msg: "К вашему аккаунту не привязан сотрудник — бронирование недоступно.",
      });
      return;
    }
    setModal(range);
  };

  /** Сдвинуть просматриваемую дату на delta дней. */
  const shiftDate = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  /** Создать бронь на сервере; при успехе закрыть модалку. */
  const createBooking = async (data: BookingDraft) => {
    try {
      await addBooking(data);
      push({ title: "Бронь создана", msg: data.topic + " · 201 Created" });
      setModal(null);
    } catch (e) {
      // Сервер отклоняет пересечение интервалов (409) — показываем его текст.
      push({ type: "error", title: "Ошибка", msg: errMessage(e) });
    }
  };

  /** Отменить бронь на сервере. */
  const cancelBooking = async (b: Booking) => {
    try {
      await removeBooking(b.id);
      push({ title: "Бронь отменена", msg: b.topic });
    } catch (e) {
      push({ type: "error", title: "Ошибка", msg: errMessage(e) });
    }
  };

  /** Сохранить изменения брони на сервере; при успехе закрыть окно. */
  const saveEdit = async (data: BookingDraft) => {
    if (!editing) return;
    try {
      await editBooking(editing.id, data);
      push({ title: t("room.bookingUpdated"), msg: data.topic });
      setEditing(null);
    } catch (e) {
      // Сервер отклоняет пересечение интервалов (409) — показываем его текст.
      push({ type: "error", title: "Ошибка", msg: errMessage(e) });
    }
  };

  // Часы сетки календаря: [CAL_START, CAL_END).
  const hours: number[] = [];
  for (let h = CAL_START; h < CAL_END; h++) hours.push(h);

  return (
    <div className="page">
      <h1>{t("room.title")}</h1>
      <p className="subtitle">{t("room.subtitle")}</p>

      {/* Переключение дня; подсказка эндпоинта GET /bookings?date=. */}
      <div className="daybar">
        <button className="btn" onClick={() => shiftDate(-1)}>
          ◀
        </button>
        <span className="date">{date}</span>
        <button className="btn" onClick={() => shiftDate(1)}>
          ▶
        </button>
        <span className="api-hint">GET /bookings?book_date={date}</span>
        {loading && <span className="api-hint">Загрузка…</span>}
      </div>

      {/* Ошибка загрузки броней с сервера. */}
      {error && !loading && (
        <div className="card" style={{ color: "var(--danger)", marginBottom: 16 }}>
          Не удалось загрузить брони: {error}
          <div style={{ marginTop: 10 }}>
            <button className="btn" onClick={reload}>
              {t("btn.retry")}
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div className="calendar">
          {/* Сетка часов: клик по строке открывает модалку на этот час. */}
          {hours.map((h) => (
            <div className="cal-row" key={h}>
              <div className="cal-time">{String(h).padStart(2, "0")}:00</div>
              <div
                className="cal-track"
                onClick={() => openSlot({ startH: h, startM: 0, endH: h + 1, endM: 0 })}
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
                  {/* Кнопка изменения: своя бронь или есть право менять за других. */}
                  {(canEditOthers || b.empId === employee?.id) && (
                    <span
                      className="ev-edit"
                      title={t("room.edit")}
                      onClick={() => setEditing(b)}
                    >
                      ✎
                    </span>
                  )}
                  {/* Кнопка отмены: своя бронь или есть право удалять за других. */}
                  {(canDeleteOthers || b.empId === employee?.id) && (
                    <span
                      className="ev-del"
                      title="Отменить (DELETE /bookings/{id})"
                      onClick={() => void cancelBooking(b)}
                    >
                      ×
                    </span>
                  )}
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
          lockedEmployee={canBookOthers ? null : employee}
          onClose={() => setModal(null)}
          onSubmit={(data) => void createBooking(data)}
        />
      )}

      {/* Модалка редактирования брони; при успехе закрывается. */}
      {editing && (
        <BookingModal
          employees={employees}
          date={date}
          init={{ startH: editing.startH, startM: editing.startM, endH: editing.endH, endM: editing.endM }}
          existing={editing}
          lockedEmployee={canBookOthers ? null : employee}
          onClose={() => setEditing(null)}
          onSubmit={(data) => void saveEdit(data)}
        />
      )}
    </div>
  );
}
