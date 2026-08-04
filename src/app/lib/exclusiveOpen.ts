import { useEffect, useRef } from "react";

/**
 * Only one dropdown/popover/menu may be open at a time anywhere in the app.
 * Each open dropdown registers itself with a unique id and a close callback;
 * opening a new one closes whichever was previously open. A plain module
 * singleton (same pattern as tapCancelGuard/modalChrome) rather than context,
 * since dropdowns are scattered across many unrelated component trees.
 */
type Entry = { id: symbol; close: () => void; contains: (target: Node) => boolean };

// A stack rather than a single slot - a dropdown can open another popover
// nested inside itself (e.g. the month/year MiniDropdown opening from
// inside an already-open calendar). Opening a new dropdown only closes
// entries that AREN'T an ancestor of it (checked via each entry's own
// `contains`, tested against the new dropdown's anchor node); an ancestor
// stays open alongside its child instead of being kicked out.
let stack: Entry[] = [];
let openedAt = 0;

function requestOpen(id: symbol, close: () => void, contains: (target: Node) => boolean, anchor: Node | null) {
  const survivors = anchor ? stack.filter(e => e.contains(anchor)) : [];
  for (const e of stack) {
    if (!survivors.includes(e)) e.close();
  }
  stack = [...survivors, { id, close, contains }];
  openedAt = Date.now();
}

function release(id: symbol) {
  stack = stack.filter(e => e.id !== id);
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
    e => {
      if (stack.length === 0) return;
      if (Date.now() - openedAt < SCROLL_CLOSE_GRACE_MS) return;
      // Scrolling inside any open dropdown's own panel (e.g. mouse-wheeling
      // through a long options list) just scrolls the list - it shouldn't
      // close anything. Only scroll outside all of them should.
      if (e.target instanceof Node && stack.some(entry => entry.contains(e.target as Node))) return;
      const closing = stack;
      stack = [];
      closing.forEach(entry => entry.close());
    },
    { capture: true, passive: true }
  );
}

/** Call with the dropdown's own `open` state and a setter to close it.
 *  Opening this dropdown closes whichever other, unrelated ones were open;
 *  closing it (from anywhere - outside click, selecting an option, etc.) is
 *  picked up automatically since `open` is re-read on every render.
 *  `contains` (optional) reports whether a given scroll-event target sits
 *  inside this dropdown's own DOM (trigger + panel, including portaled
 *  parts) - scroll within it is exempted from the auto-close-on-scroll
 *  behavior above, so its own scrollable list can be mouse-wheeled.
 *  `anchor` (optional) is this dropdown's trigger DOM node - when it sits
 *  inside another currently-open dropdown's `contains` region, that other
 *  dropdown is treated as a parent and left open instead of being closed. */
export function useExclusiveOpen(
  open: boolean,
  close: () => void,
  contains?: (target: Node) => boolean,
  anchor?: Node | null
) {
  const idRef = useRef<symbol | undefined>(undefined);
  if (!idRef.current) idRef.current = Symbol("exclusive-open");
  const closeRef = useRef(close);
  closeRef.current = close;
  const containsRef = useRef(contains);
  containsRef.current = contains;
  const anchorRef = useRef(anchor);
  anchorRef.current = anchor;

  useEffect(() => {
    const id = idRef.current!;
    if (open) {
      requestOpen(
        id,
        () => closeRef.current(),
        containsRef.current ? t => containsRef.current!(t) : () => false,
        anchorRef.current ?? null
      );
    } else {
      release(id);
    }
    return () => release(id);
  }, [open]);
}
