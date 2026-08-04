import { useEffect, useRef } from "react";

/**
 * Only one dropdown/popover/menu may be open at a time anywhere in the app.
 * Each open dropdown registers itself with a unique id and a close callback;
 * opening a new one closes whichever was previously open. A plain module
 * singleton (same pattern as tapCancelGuard/modalChrome) rather than context,
 * since dropdowns are scattered across many unrelated component trees.
 */
let activeId: symbol | null = null;
let activeClose: (() => void) | null = null;
let openedAt = 0;

function requestOpen(id: symbol, close: () => void) {
  if (activeId !== null && activeId !== id) activeClose?.();
  activeId = id;
  activeClose = close;
  openedAt = Date.now();
}

function release(id: symbol) {
  if (activeId === id) {
    activeId = null;
    activeClose = null;
  }
}

// Scrolling anywhere - the page body, a modal's own scroll area, a list -
// should close whatever dropdown is open instead of leaving it floating
// over content it no longer points at. Capture phase so it also catches
// scroll on nested scrollable ancestors (the "scroll" event doesn't bubble).
// The grace window skips scroll caused by the dropdown itself opening (e.g.
// MiniDropdown/BirthDateField scrolling their own list to the selected
// item right on open), which would otherwise close it the instant it appears.
const SCROLL_CLOSE_GRACE_MS = 250;

if (typeof window !== "undefined") {
  window.addEventListener(
    "scroll",
    () => {
      if (!activeClose) return;
      if (Date.now() - openedAt < SCROLL_CLOSE_GRACE_MS) return;
      activeClose();
    },
    { capture: true, passive: true }
  );
}

/** Call with the dropdown's own `open` state and a setter to close it.
 *  Opening this dropdown closes whichever other one was open; closing it
 *  (from anywhere - outside click, selecting an option, etc.) is picked up
 *  automatically since `open` is re-read on every render. */
export function useExclusiveOpen(open: boolean, close: () => void) {
  const idRef = useRef<symbol | undefined>(undefined);
  if (!idRef.current) idRef.current = Symbol("exclusive-open");
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    const id = idRef.current!;
    if (open) {
      requestOpen(id, () => closeRef.current());
    } else {
      release(id);
    }
    return () => release(id);
  }, [open]);
}
