/**
 * Страница «Профиль» (карточка сотрудника).
 *
 * Показывает детальные данные выбранного сотрудника и его навыки с уровнями
 * владения. Данные приходят с бэкенда через хук useProfile (эндпоинты
 * GET /employees/{id} и GET /employees/{id}/skills). Сотрудник выбирается из
 * того же справочника, что и на других страницах (текущая страница списка).
 */
import { useState } from "react";
import { HEAT, HEAT_TEXT } from "../data";
import { useProfile } from "../hooks/useProfile";
import type { Employee } from "../types";

interface ProfilePageProps {
  /** Справочник сотрудников (для выбора отображаемого профиля). */
  employees: Employee[];
}

/** Человекочитаемые названия категорий навыков. */
const CATEGORY_LABEL: Record<string, string> = {
  language: "Язык",
  database: "СУБД",
  framework: "Фреймворк",
  library: "Библиотека",
  tool: "Инструмент",
  other: "Другое",
};

/** Инициалы для аватара-заглушки, напр. «Петров Сергей» → «ПС». */
function initials(emp: Employee): string {
  return [emp.lastName, emp.firstName]
    .map((part) => part.trim()[0] ?? "")
    .join("")
    .toUpperCase();
}

/** Страница карточки профиля сотрудника. */
export function ProfilePage({ employees }: ProfilePageProps) {
  // Выбранный сотрудник; по умолчанию — первый из справочника.
  const [selectedId, setSelectedId] = useState<number | null>(employees[0]?.id ?? null);
  // Если справочник догрузился позже первого рендера — подхватываем первого.
  const currentId = selectedId ?? employees[0]?.id ?? null;
  const { employee, skills, loading, error, reload } = useProfile(currentId);

  return (
    <div className="page">
      <h1>Профиль</h1>
      <p className="subtitle">
        Карточка сотрудника: личные данные и навыки с уровнями владения.
      </p>

      {/* Выбор сотрудника; подсказка эндпоинта GET /employees/{id}. */}
      <div className="toolbar">
        <label htmlFor="profile-emp">Сотрудник:</label>
        <select
          id="profile-emp"
          className="input"
          value={currentId ?? ""}
          onChange={(e) => setSelectedId(Number(e.target.value))}
        >
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <span className="api-hint">GET /employees/{currentId ?? "—"}</span>
        {loading && <span className="api-hint">Загрузка…</span>}
      </div>

      {/* Ошибка загрузки профиля с сервера. */}
      {error && !loading && (
        <div className="card" style={{ color: "var(--danger)", marginBottom: 16 }}>
          Не удалось загрузить профиль: {error}
          <div style={{ marginTop: 10 }}>
            <button className="btn" onClick={() => void reload()}>
              Повторить
            </button>
          </div>
        </div>
      )}

      {/* Пустой справочник — выбирать некого. */}
      {!loading && !error && currentId === null && (
        <div className="card">В справочнике пока нет сотрудников.</div>
      )}

      {employee && (
        <>
          {/* Шапка профиля: аватар, ФИО, должность, служебные поля. */}
          <div className="card profile-head">
            {employee.photoUrl ? (
              <img className="profile-avatar" src={employee.photoUrl} alt={employee.name} />
            ) : (
              <div className="profile-avatar profile-avatar--initials">{initials(employee)}</div>
            )}
            <div className="profile-info">
              <div className="profile-name">{employee.name}</div>
              <div className="profile-pos">{employee.position || "Должность не указана"}</div>
              <div className="profile-meta">
                <span className="badge">ID: {employee.id}</span>
                {employee.createdAt && (
                  <span className="profile-since">
                    В системе с {employee.createdAt.slice(0, 10)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Навыки сотрудника с уровнями владения. */}
          <div className="card" style={{ marginTop: 16 }}>
            <div className="profile-section-title">
              Навыки <span className="badge">{skills.length}</span>
            </div>

            {skills.length === 0 ? (
              <div className="profile-empty">У сотрудника пока нет назначенных навыков.</div>
            ) : (
              <ul className="profile-skills">
                {skills.map((s) => (
                  <li key={s.id} className="profile-skill">
                    <div className="profile-skill-head">
                      <span className="profile-skill-name">{s.name}</span>
                      <span className="badge">{CATEGORY_LABEL[s.category] ?? s.category}</span>
                    </div>
                    {/* Шкала уровня 0..5 в цветах тепловой карты матрицы. */}
                    <div className="profile-level">
                      <span
                        className="profile-level-val"
                        style={{ background: HEAT[s.level], color: HEAT_TEXT[s.level] }}
                      >
                        {s.level}
                      </span>
                      <div className="profile-level-bar">
                        <div
                          className="profile-level-fill"
                          style={{ width: `${(s.level / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
