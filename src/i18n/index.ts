import { createContext, createElement, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { en, type Translations } from "./en";
import { km } from "./km";

export type Language = "en" | "km";

const STORAGE_KEY = "bookly-language";
const DEFAULT_LANGUAGE: Language = "en";

export const translations: Record<Language, Translations> = {
  en,
  km,
};

let currentLanguage: Language = (() => {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "km") {
      document.documentElement.lang = saved;
      return saved;
    }
  } catch {
    // localStorage may be disabled
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = DEFAULT_LANGUAGE;
  }
  return DEFAULT_LANGUAGE;
})();

const listeners = new Set<() => void>();

export function getLanguage(): Language {
  return currentLanguage;
}

export const LANGUAGE_CHANGED_EVENT = "bookly:language-changed";

export function setLanguage(lang: Language): void {
  if (currentLanguage === lang) return;
  currentLanguage = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Ignore storage errors
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
  }
  listeners.forEach((listener) => listener());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGED_EVENT, { detail: { lang } }));
  }
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Resolve a dot-notated key from translations with fallback to English.
 */
export function translate(path: string, lang: Language = currentLanguage): string {
  const keys = path.split(".");
  const getNested = (obj: unknown): string | undefined => {
    let curr: unknown = obj;
    for (const key of keys) {
      if (curr && typeof curr === "object" && key in curr) {
        curr = (curr as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }
    return typeof curr === "string" ? curr : undefined;
  };

  const val = getNested(translations[lang]);
  if (val !== undefined && val !== "") return val;
  const fallback = getNested(translations.en);
  if (fallback !== undefined) return fallback;
  return path;
}

/** Locales for Intl dates and numbers in each language; a browser without Khmer date names falls back to en-GB, not en-US. */
export const LOCALES: Record<Language, string[]> = { en: ["en-GB"], km: ["km-KH", "en-GB"] };

/** The dictionary of the current language, for code outside React (validation messages, toasts). */
export function getDict(): Translations {
  return translations[currentLanguage];
}

/**
 * A zod message that is read when the field is checked, so it follows the language switch:
 * `z.string().min(1, msg((d) => d.forms.enterName))`.
 */
export function msg(pick: (dict: Translations) => string) {
  return { error: () => pick(getDict()) };
}

// Parts of the site that stay English whatever the visitor picked (staff area, printed documents).
const FixedLanguage = createContext<Language | null>(null);

/** Keeps everything inside in English and sets <html lang="en"> while it is shown. */
export function EnglishOnly({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = "en";
    return () => {
      document.documentElement.lang = currentLanguage;
    };
  }, []);
  return createElement(FixedLanguage.Provider, { value: "en" }, children);
}

/**
 * Hook to access current language, setter, translations dictionary, and translate helper.
 */
export function useT() {
  const picked = useSyncExternalStore(subscribe, getLanguage, () => DEFAULT_LANGUAGE);
  const lang = useContext(FixedLanguage) ?? picked;
  const dict = translations[lang];

  const t = (path: string, fallback?: string): string => {
    const res = translate(path, lang);
    if (res === path && fallback !== undefined) return fallback;
    return res;
  };

  return {
    lang,
    locale: LOCALES[lang],
    setLanguage,
    dict,
    t,
  };
}

export { en, km, type Translations };

/** "Showing 25–48 of 286 books" in the given language (see lib/pagination rangeSummary). */
export function rangeText(dict: Translations, from: number | null | undefined, to: number | null | undefined, total: number, noun: string): string {
  if (!total || !from || !to) return dict.ui.none(noun);
  return dict.ui.showing(from, to, total, noun);
}

/** A book format's name ("Paperback") in the given language; unknown formats are shown as they come. */
export function formatName(dict: Translations, format: string | null | undefined): string {
  if (!format) return "";
  return format in dict.formats ? dict.formats[format as keyof Translations["formats"]] : format[0].toUpperCase() + format.slice(1);
}
