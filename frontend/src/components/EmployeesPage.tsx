/**
 * Страница «Сотрудники» — справочник с поиском и переходом в профиль.
 *
 * Грузит весь список сотрудников постранично (бэкенд отдаёт по страницам),
 * затем ищет и сортирует на клиенте. Клик по сотруднику открывает его карточку
 * (EmployeeCard). Поиск/сортировка работают по всему списку, а не по странице.
 */
import { useEffect, useState } from "react";
import { fetchEmployees } from "../api";
import type { Employee } from "../types";
import { EmployeeCard } from "./EmployeeCard";

/** Инициалы для аватара-заглушки, напр. «Петров Сергей» → «ПС». */
function initials(emp: Employee): string {
  return [emp.lastName, emp.firstName]
    .map((part) => part.trim()[0] ?? "")
    .join("")
    .toUpperCase();
}

/** Справочник сотрудников. */
export function EmployeesPage() {
  const [all, setAll] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"az" | "za">("az");
  // Выбранный сотрудник для просмотра карточки (или null — список).
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Загрузка всего справочника: листаем страницы по 20 до конца.
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const acc: Employee[] = [];
        let page = 1;
        let total = 1;
        do {
          const res = await fetchEmployees(page, 20);
          acc.push(...res.data);
          total = res.totalPages;
          page += 1;
        } while (page <= total);
        if (active) setAll(acc);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Просмотр выбранного сотрудника.
  if (selectedId !== null) {
    return (
      <div className="page">
        <button className="btn" onClick={() => setSelectedId(null)}>
          ← Назад к списку
        </button>
        <div style={{ marginTop: 16 }}>
          <EmployeeCard employeeId={selectedId} />
        </div>
      </div>
    );
  }

  // Поиск и сортировка по всему списку.
  const list = all
    .filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, "ru");
      return sortDir === "az" ? cmp : -cmp;
    });

  return (
    <div className="page">
      <h1>Сотрудники</h1>
      <p className="subtitle">Справочник сотрудников: поиск, сортировка и переход в карточку.</p>

      <div className="toolbar">
        <input
          className="input search"
          placeholder="Поиск по имени…"
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
        {!loading && !error && (
          <span className="api-hint">
            {list.length} из {all.length}
          </span>
        )}
      </div>

      {loading && <div className="card">Загрузка справочника…</div>}
      {error && !loading && (
        <div className="card" style={{ color: "var(--danger)" }}>
          Не удалось загрузить сотрудников: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="card" style={{ padding: 0 }}>
          {list.length === 0 ? (
            <div style={{ padding: 16 }}>Никого не найдено.</div>
          ) : (
            <ul className="emp-list">
              {list.map((e) => (
                <li
                  key={e.id}
                  className="emp-list-item"
                  onClick={() => setSelectedId(e.id)}
                  title="Открыть профиль"
                >
                  {e.photoUrl ? (
                    <img className="emp-avatar" src={e.photoUrl} alt={e.name} />
                  ) : (
                    <div className="emp-avatar emp-avatar--initials">{initials(e)}</div>
                  )}
                  <div className="emp-list-info">
                    <div className="name">{e.name}</div>
                    <div className="pos">{e.position || "—"}</div>
                  </div>
                  <span className="emp-list-go">›</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
