import { useEffect, useState } from "react";

// How much of the viewport's bottom is currently covered by the on-screen
// keyboard, in px (0 when it's closed). Meant to be fed straight into a
// `bottom` style on a `position: sticky` field, so the field pins itself
// just above the keyboard instead of reactively chasing it with scrollIntoView
// calls timed around focus/resize events - the same technique chat apps
// (WhatsApp Web, Telegram Web) use for their message composer.
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    function update() {
      setInset(Math.max(0, window.innerHeight - vv!.height - vv!.offsetTop));
    }
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}
