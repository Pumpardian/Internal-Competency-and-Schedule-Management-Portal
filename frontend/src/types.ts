/**
 * Доменные типы макета портала.
 *
 * Сущности предметной области: Employee, Skill, связь EmployeeSkill
 * (здесь — карта Levels) и Booking. Используются как контракт между
 * компонентами интерфейса.
 */

/** Сотрудник Отдела (справочник «Сотрудник»). */
export interface Employee {
  /** Первичный ключ. */
  id: number;
  /** ФИО в кратком виде, напр. «Иванов Иван». */
  name: string;
  /** Имя (для форм редактирования). */
  firstName: string;
  /** Фамилия (для форм редактирования). */
  lastName: string;
  /** Должность сотрудника. */
  position: string;
  /** Ссылка на фото (заполняется для детального ответа GET /employees/{id}). */
  photoUrl?: string;
  /** Дата создания записи (заполняется для детального ответа GET /employees/{id}). */
  createdAt?: string;
}

/** Профессиональный навык (справочник «Навык»). */
export interface Skill {
  /** Первичный ключ. */
  id: number;
  /** Наименование навыка, напр. «Python». */
  name: string;
  /** Категория: «язык» / «инструмент» / «СУБД» / другое. */
  category: string;
}

/**
 * Уровни владения навыками — аналог таблицы EmployeeSkill.
 * Ключ имеет вид `${empId}-${skillId}`, значение — целое 0..5
 * (0 — навык отсутствует, 5 — эксперт).
 */
export type Levels = Record<string, number>;

/** Бронь переговорной комнаты (сущность «Booking»). */
export interface Booking {
  /** Первичный ключ. */
  id: number;
  /** Тема встречи. */
  topic: string;
  /** Сотрудник-организатор (внешний ключ к Employee). */
  empId: number;
  /** Час начала (0..23). */
  startH: number;
  /** Минута начала (0..59). */
  startM: number;
  /** Час окончания. */
  endH: number;
  /** Минута окончания. */
  endM: number;
}

/** Данные новой брони до присвоения id (то, что приходит из формы). */
export type BookingDraft = Omit<Booking, "id">;

/** Временной интервал — для модалки создания и проверки пересечений. */
export type TimeRange = Pick<Booking, "startH" | "startM" | "endH" | "endM">;

/** Данные уведомления, передаваемые в `push` (без служебного id). */
export interface ToastInput {
  /** Заголовок уведомления. */
  title: string;
  /** Текст уведомления. */
  msg: string;
  /** Тип; `"error"` подсвечивает уведомление как ошибку (напр. 409 Conflict). */
  type?: "error";
}

/** Уведомление в очереди отображения (с присвоенным id). */
export interface Toast extends ToastInput {
  /** Уникальный идентификатор для ключа списка и автоудаления. */
  id: number;
}

/** Активная страница портала. */
export type Page = "team" | "room" | "profile" | "account";
