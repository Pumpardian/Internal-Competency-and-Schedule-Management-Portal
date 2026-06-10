/**
 * Страница «Команда и навыки» (подсистема «Матрица компетенций»).
 *
 * Отображает матрицу «Сотрудник × Навык», раскрашенную как тепловая карта по
 * уровню владения. Данные приходят с бэкенда. Клик по ячейке открывает поповер
 * с ползунком (0..5); подтверждение сохраняет уровень на сервере (POST/PATCH).
 * Кнопки добавления создают сотрудника и навык через REST API.
 */
import { useState } from "react";
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
  /** Идёт загрузка матрицы с сервера. */
  loading: boolean;
  /** Текст ошибки загрузки (или null). */
  error: string | null;
  /** Повторная загрузка матрицы. */
  onReload: () => void;
  /** Сохранить уровень владения на сервере. */
  onSetLevel: (empId: number, skillId: number, value: number) => Promise<void>;
  /** Создать сотрудника. */
  onAddEmployee: (firstName: string, lastName: string, position?: string) => Promise<void>;
  /** Создать навык. */
  onAddSkill: (name: string, category: string) => Promise<void>;
  /** Показ всплывающего уведомления. */
  push: (t: ToastInput) => void;
}

/** Какая ячейка матрицы сейчас редактируется (или null). */
interface EditingCell {
  empId: number;
  skillId: number;
}

/** Извлекает текст ошибки из произвольного исключения. */
function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Страница матрицы компетенций. */
export function TeamPage({
  employees,
  skills,
  levels,
  loading,
  error,
  onReload,
  onSetLevel,
  onAddEmployee,
  onAddSkill,
  push,
}: TeamPageProps) {
  // Открытая для редактирования ячейка.
  const [editing, setEditing] = useState<EditingCell | null>(null);
  // Строка поиска по сотрудникам.
  const [search, setSearch] = useState("");

  // Фильтрация сотрудников по подстроке имени (регистронезависимо).
  const filtered = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()),
  );

  /** Сохранить уровень на сервере и показать результат. */
  const commitLevel = async (emp: Employee, skill: Skill, value: number) => {
    try {
      await onSetLevel(emp.id, skill.id, value);
      push({ title: "Уровень обновлён", msg: emp.name + " · " + skill.name + " → " + value });
    } catch (e) {
      push({ type: "error", title: "Ошибка", msg: errMessage(e) });
    }
  };

  /** Запросить данные и создать сотрудника. */
  const handleAddEmployee = async () => {
    const lastName = window.prompt("Фамилия сотрудника:")?.trim();
    if (!lastName) return;
    const firstName = window.prompt("Имя сотрудника:")?.trim();
    if (!firstName) return;
    const position = window.prompt("Должность (необязательно):")?.trim() || undefined;
    try {
      await onAddEmployee(firstName, lastName, position);
      push({ title: "Сотрудник добавлен", msg: lastName + " " + firstName });
    } catch (e) {
      push({ type: "error", title: "Ошибка", msg: errMessage(e) });
    }
  };

  /** Запросить данные и создать навык. */
  const handleAddSkill = async () => {
    const name = window.prompt("Название навыка:")?.trim();
    if (!name) return;
    const category = window
      .prompt("Категория (language / database / framework / library / tool / other):", "tool")
      ?.trim();
    if (!category) return;
    try {
      await onAddSkill(name, category);
      push({ title: "Навык добавлен", msg: name + " · " + category });
    } catch (e) {
      push({ type: "error", title: "Ошибка", msg: errMessage(e) });
    }
  };

  return (
    <div className="page">
      <h1>Команда и навыки</h1>
      <p className="subtitle">
        Матрица компетенций сотрудников. Ячейка раскрашена по уровню владения (тепловая карта). Клик
        по ячейке — изменение уровня.{" "}
        <span className="api-hint">PATCH /employees/&#123;id&#125;/skills/&#123;skid&#125;</span>
      </p>

      <div className="toolbar">
        <button className="btn primary" onClick={handleAddEmployee}>
          + Добавить сотрудника
        </button>
        <button className="btn" onClick={handleAddSkill}>
          + Добавить навык
        </button>
        <button className="btn" onClick={onReload}>
          Обновить
        </button>
        <input
          className="input search"
          placeholder="Поиск сотрудника…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Состояния загрузки и ошибки соединения с бэкендом. */}
      {loading && <div className="card">Загрузка матрицы…</div>}
      {error && !loading && (
        <div className="card" style={{ color: "var(--danger)" }}>
          Не удалось загрузить данные: {error}
          <div style={{ marginTop: 10 }}>
            <button className="btn" onClick={onReload}>
              Повторить
            </button>
          </div>
        </div>
      )}

      {!loading && !error && (
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
                        onClick={() =>
                          setEditing(isEditing ? null : { empId: emp.id, skillId: s.id })
                        }
                      >
                        <span className="lvl">{lvl}</span>
                        {isEditing && (
                          <LevelPopover
                            emp={emp}
                            skill={s}
                            value={lvl}
                            onClose={(committed) => {
                              setEditing(null);
                              void commitLevel(emp, s, committed);
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
      )}
    </div>
  );
}
