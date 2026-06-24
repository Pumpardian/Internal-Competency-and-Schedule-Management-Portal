/**
 * Лёгкая интернационализация (RU / BE / EN).
 *
 * Язык хранится в localStorage и раздаётся через контекст. Хук {@link useT}
 * возвращает функцию перевода `t(key)`; вне провайдера он откатывается на
 * русский — так изолированные тесты компонентов продолжают видеть рус. строки.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** Поддерживаемые языки интерфейса. */
export type Lang = "ru" | "be" | "en";

/** Список языков для переключателя. */
export const LANGS: { value: Lang; label: string }[] = [
  { value: "ru", label: "RU" },
  { value: "be", label: "BE" },
  { value: "en", label: "EN" },
];

/** Ключ хранения языка в localStorage. */
const LANG_KEY = "portal_lang";

/** Словари переводов по ключам. Русский — базовый (фолбэк). */
const DICT: Record<Lang, Record<string, string>> = {
  ru: {
    brand: "Портал Отдела цифровизации",
    "nav.team": "Команда и навыки",
    "nav.room": "Переговорная",
    "nav.employees": "Сотрудники",
    "nav.profile": "Профиль",
    "nav.account": "Аккаунт",
    logout: "Выйти",
    themeDark: "Тёмная тема",
    themeLight: "Светлая тема",
    "team.title": "Команда и навыки",
    "room.title": "Переговорная",
    "room.subtitle": "Календарный вид дня. Клик по свободному промежутку создаёт бронь. Конфликты времени отклоняются.",
    "room.bookingNew": "Новая бронь",
    "room.bookingEdit": "Изменить бронь",
    "room.edit": "Изменить",
    "room.bookingUpdated": "Бронь обновлена",
    "employees.title": "Сотрудники",
    "employees.subtitle": "Справочник сотрудников: поиск, сортировка и переход в карточку.",
    "employees.export": "Экспорт в Excel",
    "employees.searchPh": "Поиск по имени…",
    "profile.title": "Профиль",
    "profile.subtitle": "Ваша карточка: личные данные и навыки с уровнями владения.",
    "account.title": "Аккаунт",
    "login.title": "Вход на портал",
    "login.username": "Логин",
    "login.password": "Пароль",
    "login.usernamePh": "Введите логин",
    "login.passwordPh": "Введите пароль",
    "login.submit": "Войти",
    "login.submitting": "Вход…",
    "login.toRegister": "Нет аккаунта? Зарегистрироваться",
    "register.title": "Регистрация",
    "register.username": "Логин",
    "register.password": "Пароль",
    "register.firstName": "Имя",
    "register.lastName": "Фамилия",
    "register.position": "Должность",
    "register.photo": "Фото",
    "register.usernamePh": "Придумайте логин",
    "register.passwordPh": "Придумайте пароль",
    "register.firstNamePh": "Имя сотрудника",
    "register.lastNamePh": "Фамилия сотрудника",
    "register.positionPh": "Должность (необязательно)",
    "register.submit": "Зарегистрироваться",
    "register.submitting": "Регистрация…",
    "register.toLogin": "Уже есть аккаунт? Войти",
    "password.length": "Минимум 8 символов",
    "password.upper": "Заглавная буква (A-Z)",
    "password.lower": "Строчная буква (a-z)",
    "password.digit": "Цифра",
    "password.special": "Спецсимвол",
    "password.weak": "Пароль не отвечает требованиям сложности.",
    "search.employees": "Поиск сотрудника…",
    "btn.refresh": "Обновить",
    "btn.retry": "Повторить",
    "btn.addEmployee": "+ Добавить сотрудника",
    "btn.addSkill": "+ Добавить навык",
    "btn.cancel": "Отмена",
    "btn.delete": "Удалить",
    "btn.add": "Добавить",
    "btn.save": "Сохранить",
    "btn.done": "Готово",
    "btn.removeSkill": "Снять навык",
    "btn.back": "← Назад",
    "btn.backToList": "← Назад к списку",
    "btn.saveChanges": "Сохранить изменения",
    "btn.saving": "Сохранение…",
    "btn.changeRole": "Сменить роль",
    "btn.applying": "Применение…",
    "btn.deleteAccount": "Удалить аккаунт",
    "btn.deleting": "Удаление…",
  },
  be: {
    brand: "Партал Аддзела лічбавізацыі",
    "nav.team": "Каманда і навыкі",
    "nav.room": "Перамоўная",
    "nav.employees": "Супрацоўнікі",
    "nav.profile": "Профіль",
    "nav.account": "Уліковы запіс",
    logout: "Выйсці",
    themeDark: "Цёмная тэма",
    themeLight: "Светлая тэма",
    "team.title": "Каманда і навыкі",
    "room.title": "Перамоўная",
    "room.subtitle": "Каляндарны выгляд дня. Клік па вольным прамежку стварае браніраванне. Канфлікты часу адхіляюцца.",
    "room.bookingNew": "Новае браніраванне",
    "room.bookingEdit": "Змяніць браніраванне",
    "room.edit": "Змяніць",
    "room.bookingUpdated": "Браніраванне абноўлена",
    "employees.title": "Супрацоўнікі",
    "employees.subtitle": "Даведнік супрацоўнікаў: пошук, сартаванне і пераход у картку.",
    "employees.export": "Экспарт у Excel",
    "employees.searchPh": "Пошук па імені…",
    "profile.title": "Профіль",
    "profile.subtitle": "Ваша картка: асабістыя даныя і навыкі з узроўнямі валодання.",
    "account.title": "Уліковы запіс",
    "login.title": "Уваход на партал",
    "login.username": "Лагін",
    "login.password": "Пароль",
    "login.usernamePh": "Увядзіце лагін",
    "login.passwordPh": "Увядзіце пароль",
    "login.submit": "Увайсці",
    "login.submitting": "Уваход…",
    "login.toRegister": "Няма ўліковага запісу? Зарэгістравацца",
    "register.title": "Рэгістрацыя",
    "register.username": "Лагін",
    "register.password": "Пароль",
    "register.firstName": "Імя",
    "register.lastName": "Прозвішча",
    "register.position": "Пасада",
    "register.photo": "Фота",
    "register.usernamePh": "Прыдумайце лагін",
    "register.passwordPh": "Прыдумайце пароль",
    "register.firstNamePh": "Імя супрацоўніка",
    "register.lastNamePh": "Прозвішча супрацоўніка",
    "register.positionPh": "Пасада (неабавязкова)",
    "register.submit": "Зарэгістравацца",
    "register.submitting": "Рэгістрацыя…",
    "register.toLogin": "Ужо ёсць уліковы запіс? Увайсці",
    "password.length": "Мінімум 8 сімвалаў",
    "password.upper": "Вялікая літара (A-Z)",
    "password.lower": "Малая літара (a-z)",
    "password.digit": "Лічба",
    "password.special": "Спецсімвал",
    "password.weak": "Пароль не адпавядае патрабаванням складанасці.",
    "search.employees": "Пошук супрацоўніка…",
    "btn.refresh": "Абнавіць",
    "btn.retry": "Паўтарыць",
    "btn.addEmployee": "+ Дадаць супрацоўніка",
    "btn.addSkill": "+ Дадаць навык",
    "btn.cancel": "Адмена",
    "btn.delete": "Выдаліць",
    "btn.add": "Дадаць",
    "btn.save": "Захаваць",
    "btn.done": "Гатова",
    "btn.removeSkill": "Зняць навык",
    "btn.back": "← Назад",
    "btn.backToList": "← Назад да спісу",
    "btn.saveChanges": "Захаваць змены",
    "btn.saving": "Захаванне…",
    "btn.changeRole": "Змяніць ролю",
    "btn.applying": "Прымяненне…",
    "btn.deleteAccount": "Выдаліць уліковы запіс",
    "btn.deleting": "Выдаленне…",
  },
  en: {
    brand: "Digitalization Department Portal",
    "nav.team": "Team & skills",
    "nav.room": "Meeting room",
    "nav.employees": "Employees",
    "nav.profile": "Profile",
    "nav.account": "Account",
    logout: "Log out",
    themeDark: "Dark theme",
    themeLight: "Light theme",
    "team.title": "Team & skills",
    "room.title": "Meeting room",
    "room.subtitle": "Day calendar view. Click a free slot to create a booking. Time conflicts are rejected.",
    "room.bookingNew": "New booking",
    "room.bookingEdit": "Edit booking",
    "room.edit": "Edit",
    "room.bookingUpdated": "Booking updated",
    "employees.title": "Employees",
    "employees.subtitle": "Employee directory: search, sorting and opening a card.",
    "employees.export": "Export to Excel",
    "employees.searchPh": "Search by name…",
    "profile.title": "Profile",
    "profile.subtitle": "Your card: personal data and skills with proficiency levels.",
    "account.title": "Account",
    "login.title": "Sign in to the portal",
    "login.username": "Login",
    "login.password": "Password",
    "login.usernamePh": "Enter login",
    "login.passwordPh": "Enter password",
    "login.submit": "Sign in",
    "login.submitting": "Signing in…",
    "login.toRegister": "No account? Sign up",
    "register.title": "Sign up",
    "register.username": "Login",
    "register.password": "Password",
    "register.firstName": "First name",
    "register.lastName": "Last name",
    "register.position": "Position",
    "register.photo": "Photo",
    "register.usernamePh": "Choose a login",
    "register.passwordPh": "Choose a password",
    "register.firstNamePh": "Employee first name",
    "register.lastNamePh": "Employee last name",
    "register.positionPh": "Position (optional)",
    "register.submit": "Sign up",
    "register.submitting": "Signing up…",
    "register.toLogin": "Already have an account? Sign in",
    "password.length": "At least 8 characters",
    "password.upper": "Uppercase letter (A-Z)",
    "password.lower": "Lowercase letter (a-z)",
    "password.digit": "Digit",
    "password.special": "Special character",
    "password.weak": "Password does not meet the complexity requirements.",
    "search.employees": "Find employee…",
    "btn.refresh": "Refresh",
    "btn.retry": "Retry",
    "btn.addEmployee": "+ Add employee",
    "btn.addSkill": "+ Add skill",
    "btn.cancel": "Cancel",
    "btn.delete": "Delete",
    "btn.add": "Add",
    "btn.save": "Save",
    "btn.done": "Done",
    "btn.removeSkill": "Remove skill",
    "btn.back": "← Back",
    "btn.backToList": "← Back to list",
    "btn.saveChanges": "Save changes",
    "btn.saving": "Saving…",
    "btn.changeRole": "Change role",
    "btn.applying": "Applying…",
    "btn.deleteAccount": "Delete account",
    "btn.deleting": "Deleting…",
  },
};

interface I18n {
  /** Текущий язык. */
  lang: Lang;
  /** Сменить язык. */
  setLang: (lang: Lang) => void;
  /** Перевести ключ (с откатом на русский, затем на сам ключ). */
  t: (key: string) => string;
}

const LangContext = createContext<I18n | null>(null);

/** Начальный язык: из localStorage, иначе русский. */
function initialLang(): Lang {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === "be" || saved === "en" ? saved : "ru";
}

/** Провайдер языка: оборачивает приложение, хранит выбор и раздаёт `t`. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const t = useCallback((key: string) => DICT[lang][key] ?? DICT.ru[key] ?? key, [lang]);
  const value = useMemo<I18n>(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

/** Доступ к переводам. Вне провайдера — русский (для изолированных тестов). */
export function useT(): I18n {
  const ctx = useContext(LangContext);
  if (ctx) return ctx;
  return { lang: "ru", setLang: () => {}, t: (key) => DICT.ru[key] ?? key };
}
