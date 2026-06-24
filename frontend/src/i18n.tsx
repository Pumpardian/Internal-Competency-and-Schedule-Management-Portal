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
    "employees.title": "Сотрудники",
    "employees.subtitle": "Справочник сотрудников: поиск, сортировка и переход в карточку.",
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
    "employees.title": "Супрацоўнікі",
    "employees.subtitle": "Даведнік супрацоўнікаў: пошук, сартаванне і пераход у картку.",
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
    "employees.title": "Employees",
    "employees.subtitle": "Employee directory: search, sorting and opening a card.",
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
