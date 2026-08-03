import { createContext, useContext, useState, type ReactNode } from "react";
import { en } from "./en";
import { ru } from "./ru";
import type { Dict } from "./types";

export type Lang = "en" | "ru";

export const LANG_CYCLE: Lang[] = ["en", "ru"];

const DICTS: Record<Lang, Dict> = { en, ru };

function isValidLang(l: string): l is Lang {
  return l === "en" || l === "ru";
}

interface LangCtx {
  lang: Lang;
  t: Dict;
  setLang: (l: Lang) => void;
}

const LangContext = createContext<LangCtx>({ lang: "en", t: en, setLang: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const stored = localStorage.getItem("lang") ?? "en";
  const [lang, setLangState] = useState<Lang>(isValidLang(stored) ? stored : "en");

  function setLang(l: Lang) {
    localStorage.setItem("lang", l);
    setLangState(l);
  }

  return (
    <LangContext.Provider value={{ lang, t: DICTS[lang], setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

export type { Dict };
