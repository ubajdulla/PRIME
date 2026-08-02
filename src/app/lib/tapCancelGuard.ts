/**
 * On touch devices, browsers keep pointer/click targeting locked to whatever
 * element received the touchstart (implicit pointer capture), so pressing a
 * card, dragging the finger away, and lifting elsewhere still fires "click"
 * on the original element. Worse, the synthetic click's own clientX/clientY
 * can't be trusted to reflect the lift-off point (some engines report the
 * touchstart position instead), so distance is tracked live via touchmove
 * rather than compared after the fact. Whenever the finger has strayed past
 * the threshold at any point during the gesture, the trailing click is
 * suppressed — so every button/card in the app gets drag-to-cancel without
 * reimplementing it per component.
 */
const MOVE_THRESHOLD_PX = 10;

let startX = 0;
let startY = 0;
let tracking = false;
let shouldCancel = false;

function reset() {
  tracking = false;
}

window.addEventListener(
  "touchstart",
  (e) => {
    const t = e.touches[0];
    if (!t) return;
    startX = t.clientX;
    startY = t.clientY;
    tracking = true;
    shouldCancel = false;
  },
  { passive: true, capture: true }
);

window.addEventListener(
  "touchmove",
  (e) => {
    if (!tracking) return;
    const t = e.touches[0];
    if (!t) return;
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (Math.hypot(dx, dy) > MOVE_THRESHOLD_PX) shouldCancel = true;
  },
  { passive: true, capture: true }
);

window.addEventListener("touchend", reset, { passive: true, capture: true });
window.addEventListener("touchcancel", reset, { passive: true, capture: true });

window.addEventListener(
  "click",
  (e) => {
    if (!shouldCancel) return;
    shouldCancel = false;
    e.preventDefault();
    e.stopImmediatePropagation();
  },
  { capture: true }
);
