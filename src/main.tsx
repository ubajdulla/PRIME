import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { LanguageProvider } from "./app/i18n";

// ── Universal scroll-to-top — hits every possible navigation path ─────────────

function toTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

// Never let the browser restore scroll on its own
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

// Intercept pushState only — NOT replaceState, because React Router also uses
// replaceState for internal state updates (not navigations), which would cause
// unwanted scroll-to-top in the middle of a page.
const _push = history.pushState.bind(history);
history.pushState = function (...a) { toTop(); return _push(...a); };

// Back/Forward browser buttons — rAF so reset happens after React renders
window.addEventListener("popstate", () => requestAnimationFrame(toTop), true);

// ─────────────────────────────────────────────────────────────────────────────

createRoot(document.getElementById("root")!).render(
  <LanguageProvider>
    <App />
  </LanguageProvider>
);
