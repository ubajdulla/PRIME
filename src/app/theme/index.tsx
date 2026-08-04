import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

export const THEME_CYCLE: Theme[] = ["system", "dark", "light"];

function isValidTheme(t: string): t is Theme {
  return t === "dark" || t === "light" || t === "system";
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

interface ThemeCtx {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeCtx>({ theme: "system", resolvedTheme: "dark", setTheme: () => {} });

// "theme_v2": bumped from the old "theme" key so pre-existing dark/light values
// picked under the old 2-way toggle (before "system" existed) don't override
// the new system-follows-OS default — everyone starts fresh on "system".
const STORAGE_KEY = "theme_v2";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const stored = localStorage.getItem(STORAGE_KEY) ?? "system";
  const [theme, setThemeState] = useState<Theme>(isValidTheme(stored) ? stored : "system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(
    theme === "system" ? getSystemTheme() : theme,
  );

  useEffect(() => {
    if (theme !== "system") {
      setResolvedTheme(theme);
      return;
    }
    setResolvedTheme(getSystemTheme());
    const mql = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => setResolvedTheme(getSystemTheme());
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      resolvedTheme === "light" ? "#ffffff" : "#212121",
    );
  }, [resolvedTheme]);

  function setTheme(t: Theme) {
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
