/**
 * On touch devices, browsers keep pointer/click targeting locked to whatever
 * element received the touchstart (implicit pointer capture), so pressing a
 * card, dragging the finger away, and lifting elsewhere still fires "click"
 * on the original element. This suppresses that click whenever the release
 * point ended up too far from where the touch began, so every button/card
 * in the app gets drag-to-cancel without reimplementing it per component.
 */
const MOVE_THRESHOLD_PX = 10;

let startX = 0;
let startY = 0;
let pending = false;

window.addEventListener(
  "touchstart",
  (e) => {
    const t = e.touches[0];
    if (!t) return;
    startX = t.clientX;
    startY = t.clientY;
    pending = true;
  },
  { passive: true, capture: true }
);

window.addEventListener(
  "touchcancel",
  () => { pending = false; },
  { passive: true, capture: true }
);

window.addEventListener(
  "click",
  (e) => {
    if (!pending) return;
    pending = false;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.hypot(dx, dy) > MOVE_THRESHOLD_PX) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  },
  { capture: true }
);
