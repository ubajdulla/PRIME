import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { LanguageProvider } from "./app/i18n";

function getSection(path: string): string {
  if (path === "/" || path.startsWith("/events")) return "events";
  if (path.startsWith("/alerts")) return "alerts";
  if (path.startsWith("/profile")) return "profile";
  if (path.startsWith("/admin")) return "admin";
  return path;
}

function toTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

if ("scrollRestoration" in history) history.scrollRestoration = "manual";

type HState = Record<string, unknown>;

// Shadow the current entry's path and React Router state so the popstate
// interceptor can read them even after the browser has already moved the pointer.
let currentPath = window.location.pathname;
let currentHState: HState = Object.assign({}, history.state as HState);

const _push    = history.pushState.bind(history);
const _replace = history.replaceState.bind(history);

// Tag every push with __cross:true when it crosses a section boundary
// (e.g. "View Profile" from EventDetail → /profile).
// The interceptor uses this to allow back-navigation through such pushes.
history.pushState = function (state, title, url) {
  const rawUrl    = url == null ? currentPath : String(url);
  const targetPath = rawUrl.split("?")[0].split("#")[0] || "/";
  const isCross   = getSection(currentPath) !== getSection(targetPath);
  const next      = Object.assign({}, state as HState, { __cross: isCross });
  _push(next, title, url);
  currentPath   = window.location.pathname;
  currentHState = Object.assign({}, history.state as HState);
};

// Navbar uses replace — always tag as non-cross so back is blocked through those.
history.replaceState = function (state, title, url) {
  const next = Object.assign({}, state as HState, { __cross: false });
  _replace(next, title, url);
  currentPath   = window.location.pathname;
  currentHState = Object.assign({}, history.state as HState);
};

// Capture phase — runs before React Router's bubble listener.
// Blocks back/forward across sections UNLESS the page was reached via an in-app push
// from a different section (marked __cross on the entry's history state).
window.addEventListener("popstate", (e) => {
  const targetPath   = window.location.pathname;
  const targetHState: HState = Object.assign({}, history.state as HState);
  const isCrossSection = getSection(currentPath) !== getSection(targetPath);

  if (isCrossSection) {
    // Use React Router's .idx for direction — it increments on every push/replace.
    const srcIdx = (currentHState.idx as number) ?? 0;
    const tgtIdx = (targetHState.idx as number) ?? 0;
    const isBack = tgtIdx < srcIdx;

    // Back:    allow if the page we're LEAVING was a deliberate cross-section push.
    // Forward: allow if the page we're ENTERING was a deliberate cross-section push.
    const allowed = isBack ? !!currentHState.__cross : !!targetHState.__cross;

    if (!allowed) {
      e.stopImmediatePropagation();
      // Restore URL without going through our patch (avoids side-effects on currentPath/currentHState).
      // pushState after a back-step re-adds the truncated forward entry, so the stack stays intact.
      _push(currentHState, "", currentPath);
      return;
    }
  }

  currentPath   = targetPath;
  currentHState = targetHState;
  requestAnimationFrame(toTop);
}, true);

createRoot(document.getElementById("root")!).render(
  <LanguageProvider>
    <App />
  </LanguageProvider>
);
