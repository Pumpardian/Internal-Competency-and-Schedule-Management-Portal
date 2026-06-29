/**
 * Универсальное модальное окно-форма для справочников (сотрудники, навыки).
 *
 * Используется для добавления и редактирования: набор полей задаётся через
 * `fields`, при сохранении возвращает значения в `onSubmit`. Стиль окна общий с
 * BookingModal (классы .overlay/.modal/...).
 */
import { useState } from "react";
import { useT } from "../i18n";

/** Описание одного поля формы. */
export interface FormField {
  /** Ключ значения в результирующем объекте. */
  name: string;
  /** Подпись над полем. */
  label: string;
  /** Начальное значение (для редактирования — текущее). */
  value: string;
  /** Тип поля: обычный ввод или выпадающий список. */
  type?: "text" | "select";
  /** Варианты для select: строка (значение=подпись) или {value, label}. */
  options?: Array<string | { value: string; label: string }>;
  /** Обязательно к заполнению. */
  required?: boolean;
  /** Подсказка в пустом поле. */
  placeholder?: string;
}

interface EntityModalProps {
  /** Заголовок окна. */
  title: string;
  /** Поля формы. */
  fields: FormField[];
  /** Текст кнопки подтверждения. */
  submitLabel: string;
  /** Закрыть без сохранения. */
  onClose: () => void;
  /** Отправить значения формы (ключ поля → значение). */
  onSubmit: (values: Record<string, string>) => void;
}

/** Модальная форма с произвольным набором полей. */
export function EntityModal({ title, fields, submitLabel, onClose, onSubmit }: EntityModalProps) {
  const { t } = useT();
  // Текущие значения полей, инициализируются из fields.
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, f.value])),
  );
  // Текст ошибки клиентской валидации.
  const [err, setErr] = useState("");

  const setField = (name: string, value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  /** Проверить обязательные поля и передать значения наверх. */
  const submit = () => {
    for (const f of fields) {
      if (f.required && !values[f.name].trim()) {
        setErr(`Заполните поле «${f.label}».`);
        return;
      }
    }
    onSubmit(values);
  };

  return (
    // Клик по затемнению закрывает окно; клик по самому окну — нет.
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="m-head">{title}</div>
        <div className="m-body">
          {fields.map((f, i) => (
            <div key={f.name}>
              <label>{f.label}</label>
              {f.type === "select" ? (
                <select
                  className="input"
                  style={{ width: "100%" }}
                  value={values[f.name]}
                  onChange={(e) => setField(f.name, e.target.value)}
                >
                  {(f.options ?? []).map((o) => {
                    const value = typeof o === "string" ? o : o.value;
                    const label = typeof o === "string" ? o : o.label;
                    return (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <input
                  className="input"
                  style={{ width: "100%" }}
                  value={values[f.name]}
                  autoFocus={i === 0}
                  placeholder={f.placeholder}
                  onChange={(e) => setField(f.name, e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              )}
            </div>
          ))}
          {err && <div style={{ color: "var(--danger)", fontSize: 13 }}>{err}</div>}
        </div>
        <div className="m-foot">
          <button className="btn" onClick={onClose}>
            {t("btn.cancel")}
          </button>
          <button className="btn primary" onClick={submit}>
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
