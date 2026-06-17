/**
 * Модальное окно создания брони переговорной.
 *
 * Открывается по клику на свободный слот календаря. Содержит обязательное поле
 * «Тема встречи», выбор сотрудника и время начала/окончания. Выполняет базовую
 * клиентскую валидацию перед отправкой (серверную проверку конфликтов делает
 * вызывающий компонент).
 */
import { useState } from "react";
import type { BookingDraft, Employee, TimeRange } from "../types";
import { fmt } from "../utils";

interface BookingModalProps {
  /** Список сотрудников для выпадающего списка организатора. */
  employees: Employee[];
  /** Дата брони (YYYY-MM-DD) — для заголовка окна. */
  date: string;
  /** Предзаполненный интервал (час, на который кликнули). */
  init: TimeRange;
  /** Закрыть окно без сохранения. */
  onClose: () => void;
  /** Отправить заполненную бронь на создание. */
  onSubmit: (data: BookingDraft) => void;
}

/** Форма создания новой брони. */
export function BookingModal({ employees, date, init, onClose, onSubmit }: BookingModalProps) {
  const [topic, setTopic] = useState("");
  // По умолчанию выбран первый сотрудник из справочника (0, если список пуст).
  const [empId, setEmpId] = useState<number>(employees[0]?.id ?? 0);
  const [start, setStart] = useState(fmt(init.startH, init.startM));
  const [end, setEnd] = useState(fmt(init.endH, init.endM));
  // Текст ошибки клиентской валидации.
  const [err, setErr] = useState("");

  /** Проверить поля и при успехе передать данные наверх. */
  const submit = () => {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    if (!topic.trim()) {
      setErr("Укажите тему встречи.");
      return;
    }
    // Окончание должно быть строго позже начала.
    if (eh * 60 + em <= sh * 60 + sm) {
      setErr("Время окончания должно быть позже начала.");
      return;
    }
    onSubmit({ topic: topic.trim(), empId, startH: sh, startM: sm, endH: eh, endM: em });
  };

  return (
    // Клик по затемнению закрывает окно; клик по самому окну — нет (stopPropagation).
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="m-head">Новая бронь · {date}</div>
        <div className="m-body">
          <div>
            <label>Тема встречи</label>
            <input
              className="input"
              style={{ width: "100%" }}
              value={topic}
              autoFocus
              placeholder="Например: Обсуждение спринта"
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div>
            <label>Сотрудник</label>
            <select
              className="input"
              style={{ width: "100%" }}
              value={empId}
              onChange={(e) => setEmpId(+e.target.value)}
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label>Начало</label>
              <input
                className="input"
                type="time"
                style={{ width: "100%" }}
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Окончание</label>
              <input
                className="input"
                type="time"
                style={{ width: "100%" }}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
          {/* Сообщение клиентской валидации. */}
          {err && <div style={{ color: "var(--danger)", fontSize: 13 }}>{err}</div>}
        </div>
        <div className="m-foot">
          <button className="btn" onClick={onClose}>
            Отмена
          </button>
          <button className="btn primary" onClick={submit}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
