/**
 * Загружает ВЕСЬ справочник сотрудников (все страницы), а не одну страницу.
 *
 * Нужен там, где требуется полный список независимо от пагинации матрицы
 * компетенций — например, выбор организатора при создании брони переговорной
 * (иначе в выпадающем списке видна только первая страница сотрудников).
 */
import { useEffect, useState } from "react";
import { fetchEmployees } from "../api";
import type { Employee } from "../types";

export function useAllEmployees(): { employees: Employee[]; loading: boolean; error: string | null } {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Листаем страницы по 20 до конца и собираем всех сотрудников.
        const acc: Employee[] = [];
        let page = 1;
        let total = 1;
        do {
          const res = await fetchEmployees(page, 20);
          acc.push(...res.data);
          total = res.totalPages;
          page += 1;
        } while (page <= total);
        if (active) setEmployees(acc);
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

  return { employees, loading, error };
}
