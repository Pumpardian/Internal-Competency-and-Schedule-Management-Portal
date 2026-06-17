/**
 * Страница «Аккаунт» — управление собственной учётной записью.
 *
 * Показывает и редактирует профиль текущего пользователя (данные сотрудника и
 * фото), позволяет сменить пароль. Все изменения подтверждаются текущим паролем
 * через PATCH /users/{id}/profile. Пользователь определяется по JWT.
 */
import { useEffect, useState } from "react";
import { currentUser, getProfile, updateProfile } from "../api";
import type { Employee, ToastInput } from "../types";

interface AccountPageProps {
  /** Показ всплывающего уведомления. */
  push: (t: ToastInput) => void;
}

/** Извлекает текст ошибки из произвольного исключения. */
function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Страница управления собственным аккаунтом. */
export function AccountPage({ push }: AccountPageProps) {
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

  const myId = me?.id;

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
    </div>
  );
}
