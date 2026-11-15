import { createContext, startTransition, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type ThemeMode = "light" | "dark";

interface ThemeContextValue {
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
}

/*
 * Light is the default (owner 2026-11-15). Only a theme the visitor picked with the switch is remembered, under a new
 * key: the old key also held the system setting that was saved automatically, so it is no longer read.
 */
const THEME_STORAGE_KEY = "bookly-theme-choice";

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  isDark: false,
  toggleTheme: () => undefined,
});

const getInitialTheme = (): ThemeMode => {
  if (typeof window === "undefined") {
    return "light";
  }

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "light" || storedTheme === "dark") return storedTheme;
  } catch {
    // Storage blocked: light.
  }
  return "light";
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  }, [theme]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    isDark: theme === "dark",
    toggleTheme: () => {
      startTransition(() => {
        setTheme((prev) => {
          const next = prev === "dark" ? "light" : "dark";
          try {
            window.localStorage.setItem(THEME_STORAGE_KEY, next);
          } catch {
            // Storage blocked: the choice lasts for this visit.
          }
          return next;
        });
      });
    },
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
