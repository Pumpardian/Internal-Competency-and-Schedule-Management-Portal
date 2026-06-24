/**
 * Глобальный поиск сотрудника в шапке.
 *
 * Один раз подгружает весь справочник (постранично) и ищет по имени на клиенте;
 * выбор подсказки открывает профиль сотрудника.
 */
import { useEffect, useState } from "react";
import { fetchEmployees } from "../api";
import { useT } from "../i18n";
import type { Employee } from "../types";

interface EmployeeSearchProps {
  /** Открыть профиль выбранного сотрудника. */
  onSelect: (id: number) => void;
}

/** Поле поиска сотрудника с выпадающими подсказками. */
export function EmployeeSearch({ onSelect }: EmployeeSearchProps) {
  const { t } = useT();
  const [all, setAll] = useState<Employee[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  // Загружаем весь список сотрудников один раз — листаем страницы до конца.
  useEffect(() => {
    let active = true;
    (async () => {
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
      } catch {
        // Тихо игнорируем — подсказки просто будут пустыми.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const q = query.trim().toLowerCase();
  const matches = q ? all.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 8) : [];

  return (
    <div className="combo header-search">
      <input
        className="input"
        placeholder={t("search.employees")}
        aria-label={t("search.employees")}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // onMouseDown подсказки срабатывает раньше onBlur — выбор не теряется.
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
      />
      {open && matches.length > 0 && (
        <ul className="combo-list">
          {matches.map((e) => (
            <li
              key={e.id}
              onMouseDown={() => {
                onSelect(e.id);
                setQuery("");
                setOpen(false);
              }}
            >
              {e.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
