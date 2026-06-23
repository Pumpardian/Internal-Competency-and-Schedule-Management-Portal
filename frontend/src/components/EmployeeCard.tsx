/**
 * Карточка сотрудника: личные данные и навыки с уровнями владения.
 *
 * Данные тянет хук useProfile (GET /employees/{id} и GET /employees/{id}/skills).
 * Используется и на странице «Профиль» (свой профиль), и на странице
 * «Сотрудники» (просмотр выбранного сотрудника).
 */
import { useMemo, useState } from "react";
import { CATEGORY_LABEL, HEAT, HEAT_TEXT, SKILL_CATEGORIES } from "../data";
import { useProfile } from "../hooks/useProfile";
import type { Employee } from "../types";

/** Инициалы для аватара-заглушки, напр. «Петров Сергей» → «ПС». */
function initials(emp: Employee): string {
  return [emp.lastName, emp.firstName]
    .map((part) => part.trim()[0] ?? "")
    .join("")
    .toUpperCase();
}

/** Критерий сортировки навыков в карточке. */
type SkillSort = "level-desc" | "level-asc" | "name-az" | "name-za" | "cat-az" | "cat-za";

/** Подписи вариантов сортировки для выпадающего списка. */
const SKILL_SORTS: { value: SkillSort; label: string }[] = [
  { value: "level-desc", label: "Уровень: по убыванию" },
  { value: "level-asc", label: "Уровень: по возрастанию" },
  { value: "name-az", label: "Название: А → Я" },
  { value: "name-za", label: "Название: Я → А" },
  { value: "cat-az", label: "Тип: А → Я" },
  { value: "cat-za", label: "Тип: Я → А" },
];

/** Сортирует навыки по выбранному критерию, не мутируя исходный массив.
 *  Внутри каждого критерия вторичная сортировка — по названию (для стабильности). */
function sortSkills<T extends { name: string; category: string; level: number }>(
  skills: T[],
  sort: SkillSort,
): T[] {
  const byName = (a: T, b: T) => a.name.localeCompare(b.name, "ru");
  const catLabel = (s: T) => CATEGORY_LABEL[s.category] ?? s.category;
  const byCat = (a: T, b: T) => catLabel(a).localeCompare(catLabel(b), "ru");
  const arr = [...skills];
  switch (sort) {
    case "level-desc":
      return arr.sort((a, b) => b.level - a.level || byName(a, b));
    case "level-asc":
      return arr.sort((a, b) => a.level - b.level || byName(a, b));
    case "name-az":
      return arr.sort(byName);
    case "name-za":
      return arr.sort((a, b) => -byName(a, b));
    case "cat-az":
      return arr.sort((a, b) => byCat(a, b) || byName(a, b));
    case "cat-za":
      return arr.sort((a, b) => -byCat(a, b) || byName(a, b));
  }
}

interface EmployeeCardProps {
  /** Идентификатор сотрудника (или null — нечего показывать). */
  employeeId: number | null;
}

/** Карточка одного сотрудника с его навыками. */
export function EmployeeCard({ employeeId }: EmployeeCardProps) {
  const { employee, skills, loading, error, reload } = useProfile(employeeId);

  // Сортировка навыков (по умолчанию — сильные сверху) и фильтр по типу.
  const [skillSort, setSkillSort] = useState<SkillSort>("level-desc");
  const [catFilter, setCatFilter] = useState<string>("all");
  const visibleSkills = useMemo(() => {
    const filtered = catFilter === "all" ? skills : skills.filter((s) => s.category === catFilter);
    return sortSkills(filtered, skillSort);
  }, [skills, skillSort, catFilter]);

  return (
    <>
      {loading && <div className="card">Загрузка…</div>}

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
            <div className="profile-section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>Навыки</span>
              <span className="badge">{skills.length}</span>
              {skills.length > 0 && (
                <>
                  <select
                    className="input"
                    style={{ marginLeft: "auto", width: "auto" }}
                    value={catFilter}
                    onChange={(e) => setCatFilter(e.target.value)}
                    aria-label="Тип навыка"
                  >
                    <option value="all">Все типы</option>
                    {SKILL_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <select
                    className="input"
                    style={{ width: "auto" }}
                    value={skillSort}
                    onChange={(e) => setSkillSort(e.target.value as SkillSort)}
                    aria-label="Сортировка навыков"
                  >
                    {SKILL_SORTS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>

            {skills.length === 0 ? (
              <div className="profile-empty">У сотрудника пока нет назначенных навыков.</div>
            ) : visibleSkills.length === 0 ? (
              <div className="profile-empty">Навыков выбранного типа нет.</div>
            ) : (
              <ul className="profile-skills">
                {visibleSkills.map((s) => (
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
    </>
  );
}
