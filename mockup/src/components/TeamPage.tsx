/**
 * Страница «Команда и навыки» (подсистема «Матрица компетенций»).
 *
 * Отображает матрицу «Сотрудник × Навык», раскрашенную как тепловая карта по
 * уровню владения. Клик по ячейке открывает поповер с ползунком (0..5).
 * Кнопки добавления и подсказки эндпоинтов носят демонстрационный характер —
 * реальные вызовы API появятся на этапах 3–4.
 */
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { HEAT, HEAT_TEXT } from "../data";
import type { Employee, Levels, Skill, ToastInput } from "../types";
import { LevelPopover } from "./LevelPopover";

interface TeamPageProps {
  /** Справочник сотрудников. */
  employees: Employee[];
  /** Справочник навыков. */
  skills: Skill[];
  /** Карта уровней владения. */
  levels: Levels;
  /** Сеттер карты уровней. */
  setLevels: Dispatch<SetStateAction<Levels>>;
  /** Показ всплывающего уведомления. */
  push: (t: ToastInput) => void;
}

/** Какая ячейка матрицы сейчас редактируется (или null). */
interface EditingCell {
  empId: number;
  skillId: number;
}

/** Страница матрицы компетенций. */
export function TeamPage({ employees, skills, levels, setLevels, push }: TeamPageProps) {
  // Открытая для редактирования ячейка.
  const [editing, setEditing] = useState<EditingCell | null>(null);
  // Строка поиска по сотрудникам.
  const [search, setSearch] = useState("");

  // Фильтрация сотрудников по подстроке имени (регистронезависимо).
  const filtered = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()),
  );

  /** Установить уровень владения для пары «сотрудник-навык». */
  const setLevel = (empId: number, skillId: number, value: number) => {
    setLevels((prev) => ({ ...prev, [empId + "-" + skillId]: value }));
  };

  return (
    <div className="page">
      <h1>Команда и навыки</h1>
      <p className="subtitle">
        Матрица компетенций сотрудников. Ячейка раскрашена по уровню владения (тепловая карта). Клик
        по ячейке — изменение уровня.{" "}
        <span className="api-hint">PATCH /employees/&#123;id&#125;/skills/&#123;skid&#125;</span>
      </p>

      {/* Панель инструментов: добавление сущностей (заглушки) и поиск. */}
      <div className="toolbar">
        <button
          className="btn primary"
          onClick={() =>
            push({ title: "Демо", msg: "Здесь откроется форма добавления сотрудника (POST /employees)." })
          }
        >
          + Добавить сотрудника
        </button>
        <button
          className="btn"
          onClick={() =>
            push({ title: "Демо", msg: "Здесь откроется форма добавления навыка (POST /skills)." })
          }
        >
          + Добавить навык
        </button>
        <input
          className="input search"
          placeholder="Поиск сотрудника…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card">
        {/* Матрица: строки — сотрудники, столбцы — навыки. */}
        <table className="matrix">
          <thead>
            <tr>
              <th className="corner">Сотрудник \ Навык</th>
              {skills.map((s) => (
                <th key={s.id}>
                  {s.name}
                  <div style={{ fontWeight: 400, fontSize: 11, color: "#999" }}>{s.category}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp) => (
              <tr key={emp.id}>
                <td className="emp">
                  <div className="name">{emp.name}</div>
                  <div className="pos">{emp.position}</div>
                </td>
                {skills.map((s) => {
                  // Уровень для пары; отсутствующий уровень трактуется как 0.
                  const lvl = levels[emp.id + "-" + s.id] ?? 0;
                  const isEditing =
                    editing !== null && editing.empId === emp.id && editing.skillId === s.id;
                  return (
                    <td
                      key={s.id}
                      className="cell"
                      // Цвет фона и текста берём из тепловой карты по уровню.
                      style={{ background: HEAT[lvl], color: HEAT_TEXT[lvl] }}
                      // Клик переключает редактирование этой ячейки.
                      onClick={() => setEditing(isEditing ? null : { empId: emp.id, skillId: s.id })}
                    >
                      <span className="lvl">{lvl}</span>
                      {isEditing && (
                        <LevelPopover
                          emp={emp}
                          skill={s}
                          value={lvl}
                          onChange={(value) => setLevel(emp.id, s.id, value)}
                          onClose={(committed) => {
                            setEditing(null);
                            // Уведомляем только если уровень ненулевой (как индикатор изменения).
                            if (committed) {
                              push({
                                title: "Уровень обновлён",
                                msg: emp.name + " · " + s.name + " → " + committed,
                              });
                            }
                          }}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Легенда соответствия цвета и уровня. */}
        <div className="legend">
          <span>Уровень владения:</span>
          {HEAT.map((c, i) => (
            <span key={i} className="sw" style={{ background: c, color: HEAT_TEXT[i] }}>
              {i}
            </span>
          ))}
          <span style={{ marginLeft: 8 }}>0 — отсутствует, 5 — эксперт</span>
        </div>
      </div>
    </div>
  );
}
