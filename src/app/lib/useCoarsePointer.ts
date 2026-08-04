import { useEffect, useState } from "react";

// True on touch-primary devices (phones/tablets - iOS, Android), false on
// mouse-driven desktops. Checks the input mechanism itself rather than
// viewport width, so a narrow desktop browser window still gets the custom
// UI and a large touch tablet still gets the native one.
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(pointer: coarse)");
    setCoarse(mql.matches);
    const onChange = () => setCoarse(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return coarse;
}
