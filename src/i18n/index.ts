import { useSyncExternalStore } from "react";
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

/**
 * Hook to access current language, setter, translations dictionary, and translate helper.
 */
export function useT() {
  const lang = useSyncExternalStore(subscribe, getLanguage, () => DEFAULT_LANGUAGE);
  const dict = translations[lang];

  const t = (path: string, fallback?: string): string => {
    const res = translate(path, lang);
    if (res === path && fallback !== undefined) return fallback;
    return res;
  };

  return {
    lang,
    setLanguage,
    dict,
    t,
  };
}

export { en, km, type Translations };
