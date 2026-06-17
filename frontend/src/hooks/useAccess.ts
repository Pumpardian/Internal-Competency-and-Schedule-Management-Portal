/**
 * Доступ текущего пользователя: его профиль сотрудника и набор прав роли.
 *
 * Используется для разграничения интерфейса (например, бронирование за других
 * доступно только при наличии права booking.create). Данные собираются из JWT
 * (id пользователя), его роли и прав роли.
 */
import { useEffect, useState } from "react";
import { currentUser, fetchRolePermissions, getProfile, getRole } from "../api";
import type { Employee } from "../types";

export interface Access {
  /** Профиль сотрудника текущего пользователя (или null, если не привязан). */
  employee: Employee | null;
  /** Набор названий прав текущей роли. */
  permissions: Set<string>;
  loading: boolean;
  /** Есть ли у пользователя указанное право. */
  can: (permission: string) => boolean;
}

export function useAccess(): Access {
  const me = currentUser();
  const myId = me?.id;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (myId === undefined) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const [profile, role] = await Promise.all([getProfile(myId), getRole(myId)]);
        const perms = await fetchRolePermissions(role.id);
        if (!active) return;
        setEmployee(profile);
        setPermissions(new Set(perms));
      } catch {
        // Тихо игнорируем: интерфейс просто останется в наиболее ограниченном режиме.
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [myId]);

  return { employee, permissions, loading, can: (p) => permissions.has(p) };
}
