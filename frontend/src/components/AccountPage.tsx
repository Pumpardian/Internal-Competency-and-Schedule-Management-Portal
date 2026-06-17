/**
 * Страница «Аккаунт» — управление собственной учётной записью.
 *
 * Показывает и редактирует профиль текущего пользователя (данные сотрудника и
 * фото), позволяет сменить пароль. Все изменения подтверждаются текущим паролем
 * через PATCH /users/{id}/profile. Пользователь определяется по JWT.
 */
import { useEffect, useState } from "react";
import {
  currentUser,
  deleteAccount,
  fetchRoles,
  getProfile,
  getRole,
  updateProfile,
  updateUserRole,
  type ApiRole,
} from "../api";
import type { Employee, ToastInput } from "../types";

interface AccountPageProps {
  /** Показ всплывающего уведомления. */
  push: (t: ToastInput) => void;
  /** Выход из системы (после удаления аккаунта). */
  onLogout: () => void;
}

/** Извлекает текст ошибки из произвольного исключения. */
function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Страница управления собственным аккаунтом. */
export function AccountPage({ push, onLogout }: AccountPageProps) {
  const me = currentUser();
  // Профиль сотрудника текущего пользователя (или null, если его нет).
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Поля формы.
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [position, setPosition] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // Роль текущего пользователя и (для админа) управление ролями других.
  const [role, setRole] = useState<ApiRole | null>(null);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [targetUserId, setTargetUserId] = useState("");
  const [targetRoleId, setTargetRoleId] = useState<number | "">("");
  const [changingRole, setChangingRole] = useState(false);

  // Удаление аккаунта.
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const myId = me?.id;
  const isAdmin = role?.name === "admin";

  // Загрузка профиля при открытии страницы.
  useEffect(() => {
    if (myId === undefined) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    getProfile(myId)
      .then((emp) => {
        if (!active) return;
        setEmployee(emp);
        if (emp) {
          setFirstName(emp.firstName);
          setLastName(emp.lastName);
          setPosition(emp.position);
        }
      })
      .catch((e) => active && setError(errMessage(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [myId]);

  // Роль текущего пользователя (для отображения и проверки прав).
  useEffect(() => {
    if (myId === undefined) return;
    let active = true;
    getRole(myId)
      .then((r) => active && setRole(r))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [myId]);

  // Список ролей нужен только администратору — для выпадающего списка.
  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    fetchRoles()
      .then((rs) => active && setRoles(rs))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isAdmin]);

  /** Сохранение изменений профиля (с подтверждением текущим паролем). */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (myId === undefined) return;
    setSaving(true);
    try {
      const employeeChanges = employee
        ? { first_name: firstName.trim(), last_name: lastName.trim(), position: position.trim() }
        : undefined;
      await updateProfile(
        myId,
        currentPassword,
        { newPassword: newPassword || undefined, employee: employeeChanges },
        photo,
      );
      push({ title: "Профиль обновлён", msg: "Изменения сохранены" });
      setCurrentPassword("");
      setNewPassword("");
      setPhoto(null);
      // Перечитываем профиль, чтобы показать актуальные данные/фото.
      setEmployee(await getProfile(myId));
    } catch (err) {
      push({ type: "error", title: "Ошибка", msg: errMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  /** Смена роли указанного пользователя (только для администратора). */
  const handleChangeRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = Number(targetUserId);
    if (!uid || targetRoleId === "") return;
    setChangingRole(true);
    try {
      await updateUserRole(uid, Number(targetRoleId));
      push({ title: "Роль изменена", msg: `Пользователь #${uid}` });
      setTargetUserId("");
      setTargetRoleId("");
    } catch (err) {
      push({ type: "error", title: "Ошибка", msg: errMessage(err) });
    } finally {
      setChangingRole(false);
    }
  };

  /** Удаление собственного аккаунта (с подтверждением паролем). */
  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (myId === undefined) return;
    setDeleting(true);
    try {
      await deleteAccount(myId, deletePassword);
      push({ title: "Аккаунт удалён", msg: "До свидания!" });
      onLogout();
    } catch (err) {
      push({ type: "error", title: "Ошибка", msg: errMessage(err) });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page">
      <h1>Аккаунт</h1>
      <p className="subtitle">
        Управление собственной учётной записью.{" "}
        <span className="api-hint">PATCH /users/&#123;id&#125;/profile</span>
      </p>

      {loading && <div className="card">Загрузка…</div>}
      {error && !loading && (
        <div className="card" style={{ color: "var(--danger)" }}>
          Не удалось загрузить аккаунт: {error}
        </div>
      )}

      {!loading && !error && (
        <form className="card account-form" onSubmit={handleSave}>
          <div className="account-row">
            <span className="account-label">Логин</span>
            <span className="account-value">{me?.username}</span>
          </div>

          {employee ? (
            <>
              <label className="auth-field">
                <span>Фамилия</span>
                <input
                  className="input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </label>
              <label className="auth-field">
                <span>Имя</span>
                <input
                  className="input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </label>
              <label className="auth-field">
                <span>Должность</span>
                <input
                  className="input"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                />
              </label>
              <label className="auth-field">
                <span>Фото</span>
                <input
                  className="input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                />
              </label>
            </>
          ) : (
            <div className="account-note">
              К аккаунту не привязан профиль сотрудника — доступна только смена пароля.
            </div>
          )}

          <label className="auth-field">
            <span>Новый пароль (необязательно)</span>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              placeholder="Оставьте пустым, чтобы не менять"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>

          <label className="auth-field">
            <span>Текущий пароль (для подтверждения)</span>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              placeholder="Введите текущий пароль"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>

          <button className="btn primary" type="submit" disabled={saving || !currentPassword}>
            {saving ? "Сохранение…" : "Сохранить изменения"}
          </button>
        </form>
      )}

      {!loading && !error && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="account-row">
            <span className="account-label">Роль</span>
            <span className="account-value">{role?.name ?? "—"}</span>
          </div>
        </div>
      )}

      {/* Управление ролями доступно только администратору (право user_role.update). */}
      {!loading && !error && isAdmin && (
        <form className="card" style={{ marginTop: 16 }} onSubmit={handleChangeRole}>
          <div className="profile-section-title">Смена роли пользователя</div>
          <label className="auth-field">
            <span>ID пользователя</span>
            <input
              className="input"
              type="number"
              min={1}
              placeholder="Напр. 2"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
            />
          </label>
          <label className="auth-field">
            <span>Роль</span>
            <select
              className="input"
              value={targetRoleId}
              onChange={(e) => setTargetRoleId(e.target.value === "" ? "" : Number(e.target.value))}
            >
              <option value="">— выберите роль —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="btn primary"
            type="submit"
            disabled={changingRole || !targetUserId || targetRoleId === ""}
          >
            {changingRole ? "Применение…" : "Сменить роль"}
          </button>
        </form>
      )}

      {/* Удаление аккаунта — необратимое действие, требует пароль. */}
      {!loading && !error && (
        <form className="card account-danger" style={{ marginTop: 16 }} onSubmit={handleDelete}>
          <div className="profile-section-title">Удаление аккаунта</div>
          <div className="account-note">
            Действие необратимо: аккаунт и связанный профиль будут удалены.
          </div>
          <label className="auth-field">
            <span>Текущий пароль</span>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              placeholder="Введите пароль для подтверждения"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
            />
          </label>
          <button className="btn danger" type="submit" disabled={deleting || !deletePassword}>
            {deleting ? "Удаление…" : "Удалить аккаунт"}
          </button>
        </form>
      )}
    </div>
  );
}
