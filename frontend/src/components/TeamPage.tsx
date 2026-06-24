/**
 * Страница «Команда и навыки» (подсистема «Матрица компетенций»).
 *
 * Отображает матрицу «Сотрудник × Навык», раскрашенную как тепловая карта по
 * уровню владения. Данные приходят с бэкенда. Клик по ячейке открывает поповер
 * с ползунком (0..5); подтверждение сохраняет уровень на сервере (POST/PATCH).
 * Кнопки добавления создают сотрудника и навык через REST API.
 */
import { useState } from "react";
import { CATEGORY_LABEL, HEAT, HEAT_TEXT, SKILL_CATEGORIES } from "../data";
import { useAccess } from "../hooks/useAccess";
import { useT } from "../i18n";
import type { Employee, Levels, Skill, ToastInput } from "../types";
import { EntityModal, type FormField } from "./EntityModal";
import { LevelPopover } from "./LevelPopover";

/** Какая модальная форма открыта (или null — закрыта). */
type ModalState =
  | { kind: "addEmployee" }
  | { kind: "editEmployee"; emp: Employee }
  | { kind: "addSkill" }
  | { kind: "editSkill"; skill: Skill };

/** Заголовок, подпись кнопки и поля формы для текущего состояния модалки. */
function modalConfig(modal: ModalState): {
  title: string;
  submitLabel: string;
  fields: FormField[];
} {
  switch (modal.kind) {
    case "addEmployee":
      return {
        title: "Новый сотрудник",
        submitLabel: "Добавить",
        fields: [
          { name: "lastName", label: "Фамилия", value: "", required: true, placeholder: "Иванов" },
          { name: "firstName", label: "Имя", value: "", required: true, placeholder: "Иван" },
          { name: "position", label: "Должность", value: "", placeholder: "Разработчик" },
        ],
      };
    case "editEmployee":
      return {
        title: "Изменить сотрудника",
        submitLabel: "Сохранить",
        fields: [
          { name: "lastName", label: "Фамилия", value: modal.emp.lastName, required: true },
          { name: "firstName", label: "Имя", value: modal.emp.firstName, required: true },
          { name: "position", label: "Должность", value: modal.emp.position },
        ],
      };
    case "addSkill":
      return {
        title: "Новый навык",
        submitLabel: "Добавить",
        fields: [
          { name: "name", label: "Название", value: "", required: true, placeholder: "Python" },
          {
            name: "category",
            label: "Категория",
            value: "tool",
            type: "select",
            options: SKILL_CATEGORIES,
          },
        ],
      };
    case "editSkill":
      return {
        title: "Изменить навык",
        submitLabel: "Сохранить",
        fields: [
          { name: "name", label: "Название", value: modal.skill.name, required: true },
          {
            name: "category",
            label: "Категория",
            value: modal.skill.category,
            type: "select",
            options: SKILL_CATEGORIES,
          },
        ],
      };
  }
}

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
  /** Обновить данные сотрудника. */
  onEditEmployee: (
    id: number,
    fields: { first_name?: string; last_name?: string; position?: string },
  ) => Promise<void>;
  /** Удалить сотрудника. */
  onRemoveEmployee: (id: number) => Promise<void>;
  /** Обновить навык. */
  onEditSkill: (id: number, name: string, category: string) => Promise<void>;
  /** Удалить навык. */
  onRemoveSkill: (id: number) => Promise<void>;
  /** Снять навык у сотрудника. */
  onRemoveSkillFromEmployee: (empId: number, skillId: number) => Promise<void>;
  /** Открыть профиль сотрудника (по клику на него в матрице). */
  onOpenEmployee: (id: number) => void;
  /** Текущая страница сотрудников (строки). */
  employeePage: number;
  /** Всего страниц сотрудников. */
  employeeTotalPages: number;
  /** Перейти на страницу сотрудников. */
  onEmployeePage: (page: number) => void;
  /** Текущая страница навыков (столбцы). */
  skillPage: number;
  /** Всего страниц навыков. */
  skillTotalPages: number;
  /** Перейти на страницу навыков. */
  onSkillPage: (page: number) => void;
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

/** Инициалы для аватара-заглушки, напр. «Петров Сергей» → «ПС». */
function initials(emp: Employee): string {
  return [emp.lastName, emp.firstName]
    .map((part) => part.trim()[0] ?? "")
    .join("")
    .toUpperCase();
}

/** Постраничная навигация «‹ N / M ›». Скрывается, если страница всего одна. */
function Pager({
  label,
  page,
  totalPages,
  onChange,
}: {
  label: string;
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="pager">
      <span className="pager-label">{label}</span>
      <button
        className="btn small"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Предыдущая страница"
      >
        ‹
      </button>
      <span className="pager-info">
        {page} / {totalPages}
      </span>
      <button
        className="btn small"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Следующая страница"
      >
        ›
      </button>
    </div>
  );
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
  onEditEmployee,
  onRemoveEmployee,
  onEditSkill,
  onRemoveSkill,
  onRemoveSkillFromEmployee,
  onOpenEmployee,
  employeePage,
  employeeTotalPages,
  onEmployeePage,
  skillPage,
  skillTotalPages,
  onSkillPage,
  push,
}: TeamPageProps) {
  // Открытая для редактирования ячейка.
  const [editing, setEditing] = useState<EditingCell | null>(null);
  // Открытая модальная форма добавления/редактирования (или null).
  const [modal, setModal] = useState<ModalState | null>(null);
  // Запрошенное удаление, ожидающее подтверждения (или null).
  const [pendingDelete, setPendingDelete] = useState<{
    message: string;
    action: () => Promise<void>;
  } | null>(null);
  // Строка поиска по сотрудникам.
  const [search, setSearch] = useState("");
  // Направление сортировки сотрудников по ФИО.
  const [sortDir, setSortDir] = useState<"az" | "za">("az");

  // Права текущего пользователя — какие изменения матрицы ему доступны.
  const { can } = useAccess();
  const { t } = useT();
  const canAddEmployee = can("employee.create");
  const canAddSkill = can("skill.create");
  const canEditEmployee = can("employee.update");
  const canDeleteEmployee = can("employee.delete");
  const canEditSkill = can("skill.update");
  const canDeleteSkill = can("skill.delete");
  const canEditLevels = can("employee_skill.create") || can("employee_skill.update");
  const canRemoveLevel = can("employee_skill.delete");

  // Фильтрация сотрудников по подстроке имени (регистронезависимо).
  // Поиск и сортировка работают в пределах текущей страницы (бэкенд их не поддерживает).
  const filtered = employees
    .filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, "ru");
      return sortDir === "az" ? cmp : -cmp;
    });

  /** Сохранить уровень на сервере и показать результат. */
  const commitLevel = async (emp: Employee, skill: Skill, value: number) => {
    try {
      await onSetLevel(emp.id, skill.id, value);
      push({ title: "Уровень обновлён", msg: emp.name + " · " + skill.name + " → " + value });
    } catch (e) {
      push({ type: "error", title: "Ошибка", msg: errMessage(e) });
    }
  };

  // Открытие модальных форм.
  const handleAddEmployee = () => setModal({ kind: "addEmployee" });
  const handleAddSkill = () => setModal({ kind: "addSkill" });
  const handleEditEmployee = (emp: Employee) => setModal({ kind: "editEmployee", emp });
  const handleEditSkill = (skill: Skill) => setModal({ kind: "editSkill", skill });

  /** Сохранить данные из открытой модальной формы. */
  const submitModal = async (values: Record<string, string>) => {
    if (!modal) return;
    try {
      if (modal.kind === "addEmployee") {
        await onAddEmployee(
          values.firstName.trim(),
          values.lastName.trim(),
          values.position.trim() || undefined,
        );
        push({ title: "Сотрудник добавлен", msg: values.lastName + " " + values.firstName });
      } else if (modal.kind === "editEmployee") {
        await onEditEmployee(modal.emp.id, {
          first_name: values.firstName.trim(),
          last_name: values.lastName.trim(),
          position: values.position.trim(),
        });
        push({ title: "Сотрудник обновлён", msg: values.lastName + " " + values.firstName });
      } else if (modal.kind === "addSkill") {
        await onAddSkill(values.name.trim(), values.category);
        const cat = CATEGORY_LABEL[values.category] ?? values.category;
        push({ title: "Навык добавлен", msg: values.name + " · " + cat });
      } else if (modal.kind === "editSkill") {
        await onEditSkill(modal.skill.id, values.name.trim(), values.category);
        const cat = CATEGORY_LABEL[values.category] ?? values.category;
        push({ title: "Навык обновлён", msg: values.name + " · " + cat });
      }
      setModal(null);
    } catch (e) {
      // Окно оставляем открытым, чтобы можно было поправить данные (напр. дубликат).
      push({ type: "error", title: "Ошибка", msg: errMessage(e) });
    }
  };

  /** Запросить удаление сотрудника (откроет окно подтверждения). */
  const handleRemoveEmployee = (emp: Employee) =>
    setPendingDelete({
      message: `Удалить сотрудника «${emp.name}»?`,
      action: async () => {
        await onRemoveEmployee(emp.id);
        push({ title: "Сотрудник удалён", msg: emp.name });
      },
    });

  /** Запросить удаление навыка (откроет окно подтверждения). */
  const handleRemoveSkill = (skill: Skill) =>
    setPendingDelete({
      message: `Удалить навык «${skill.name}»?`,
      action: async () => {
        await onRemoveSkill(skill.id);
        push({ title: "Навык удалён", msg: skill.name });
      },
    });

  /** Выполнить подтверждённое удаление. */
  const runPendingDelete = async () => {
    if (!pendingDelete) return;
    try {
      await pendingDelete.action();
    } catch (e) {
      push({ type: "error", title: "Ошибка", msg: errMessage(e) });
    } finally {
      setPendingDelete(null);
    }
  };

  /** Снять навык у сотрудника (удалить связь). */
  const commitRemoveSkill = async (emp: Employee, skill: Skill) => {
    try {
      await onRemoveSkillFromEmployee(emp.id, skill.id);
      push({ title: "Навык снят", msg: emp.name + " · " + skill.name });
    } catch (e) {
      push({ type: "error", title: "Ошибка", msg: errMessage(e) });
    }
  };

  return (
    <div className="page">
      <h1>{t("team.title")}</h1>
      <p className="subtitle">
        Матрица компетенций сотрудников. Ячейка раскрашена по уровню владения (тепловая карта). Клик
        по ячейке — изменение уровня.{" "}
        <span className="api-hint">PATCH /employees/&#123;id&#125;/skills/&#123;skid&#125;</span>
      </p>

      <div className="toolbar">
        {canAddEmployee && (
          <button className="btn primary" onClick={handleAddEmployee}>
            + Добавить сотрудника
          </button>
        )}
        {canAddSkill && (
          <button className="btn" onClick={handleAddSkill}>
            + Добавить навык
          </button>
        )}
        <button className="btn" onClick={onReload}>
          Обновить
        </button>
        <input
          className="input search"
          placeholder="Поиск на странице…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input"
          value={sortDir}
          onChange={(e) => setSortDir(e.target.value as "az" | "za")}
          aria-label="Сортировка сотрудников"
        >
          <option value="az">ФИО: А → Я</option>
          <option value="za">ФИО: Я → А</option>
        </select>
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
          {/* Пагинация столбцов: листание навыков. */}
          <div className="pager-bar">
            <Pager
              label="Навыки"
              page={skillPage}
              totalPages={skillTotalPages}
              onChange={onSkillPage}
            />
          </div>

          {/* Матрица: строки — сотрудники, столбцы — навыки. */}
          <table className="matrix">
            <thead>
              <tr>
                <th className="corner">Сотрудник \ Навык</th>
                {skills.map((s) => (
                  <th key={s.id}>
                    {s.name}
                    <div style={{ fontWeight: 400, fontSize: 11, color: "#999" }}>
                      {CATEGORY_LABEL[s.category] ?? s.category}
                    </div>
                    {(canEditSkill || canDeleteSkill) && (
                      <div className="hdr-actions">
                        {canEditSkill && (
                          <button
                            className="icon-btn"
                            title="Изменить навык"
                            onClick={() => handleEditSkill(s)}
                          >
                            ✎
                          </button>
                        )}
                        {canDeleteSkill && (
                          <button
                            className="icon-btn danger"
                            title="Удалить навык"
                            onClick={() => handleRemoveSkill(s)}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
                <tr key={emp.id}>
                  <td className="emp">
                    <div className="emp-row">
                      <div
                        className="emp-ident emp-ident--clickable"
                        onClick={() => onOpenEmployee(emp.id)}
                        title="Открыть профиль"
                      >
                        {emp.photoUrl ? (
                          <img className="emp-avatar" src={emp.photoUrl} alt={emp.name} />
                        ) : (
                          <div className="emp-avatar emp-avatar--initials">{initials(emp)}</div>
                        )}
                        <div>
                          <div className="name">{emp.name}</div>
                          <div className="pos">{emp.position}</div>
                        </div>
                      </div>
                      {(canEditEmployee || canDeleteEmployee) && (
                        <div className="hdr-actions">
                          {canEditEmployee && (
                            <button
                              className="icon-btn"
                              title="Изменить сотрудника"
                              onClick={() => handleEditEmployee(emp)}
                            >
                              ✎
                            </button>
                          )}
                          {canDeleteEmployee && (
                            <button
                              className="icon-btn danger"
                              title="Удалить сотрудника"
                              onClick={() => handleRemoveEmployee(emp)}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  {skills.map((s) => {
                    // Уровень для пары; отсутствующий уровень трактуется как 0.
                    // Наличие ключа в levels означает, что связь назначена на сервере.
                    const isAssigned = levels[emp.id + "-" + s.id] !== undefined;
                    const lvl = levels[emp.id + "-" + s.id] ?? 0;
                    const isEditing =
                      editing !== null && editing.empId === emp.id && editing.skillId === s.id;
                    return (
                      <td
                        key={s.id}
                        className="cell"
                        // Цвет фона и текста берём из тепловой карты по уровню.
                        // Курсор-указатель только если уровни можно менять.
                        style={{
                          background: HEAT[lvl],
                          color: HEAT_TEXT[lvl],
                          cursor: canEditLevels ? "pointer" : "default",
                        }}
                        // Клик переключает редактирование этой ячейки (если есть право).
                        onClick={
                          canEditLevels
                            ? () => setEditing(isEditing ? null : { empId: emp.id, skillId: s.id })
                            : undefined
                        }
                      >
                        <span className="lvl">{lvl}</span>
                        {isEditing && (
                          <LevelPopover
                            emp={emp}
                            skill={s}
                            value={lvl}
                            canRemove={isAssigned && canRemoveLevel}
                            onRemove={() => {
                              setEditing(null);
                              void commitRemoveSkill(emp, s);
                            }}
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

          {/* Пагинация строк: листание сотрудников. */}
          <div className="pager-bar">
            <Pager
              label="Сотрудники"
              page={employeePage}
              totalPages={employeeTotalPages}
              onChange={onEmployeePage}
            />
          </div>

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

      {/* Модальная форма добавления/редактирования сотрудника или навыка. */}
      {modal && (
        <EntityModal
          {...modalConfig(modal)}
          onClose={() => setModal(null)}
          onSubmit={submitModal}
        />
      )}

      {/* Окно подтверждения удаления. */}
      {pendingDelete && (
        <div className="overlay" onClick={() => setPendingDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="m-head">Подтверждение</div>
            <div className="m-body">{pendingDelete.message}</div>
            <div className="m-foot">
              <button className="btn" onClick={() => setPendingDelete(null)}>
                Отмена
              </button>
              <button className="btn danger" onClick={runPendingDelete}>
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
