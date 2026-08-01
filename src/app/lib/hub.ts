/** Navigation "hub" tracker — decides which browser-back presses the app allows.
 *
 *  Each top-level navbar destination (event feed, alerts, profile, admin) is a hub.
 *  Clicking a navbar tab always `replace`s, so it never leaves a hub-crossing
 *  entry in history — but content pages reached by push (event detail, player
 *  profile, ...) can be entered from *any* hub. Those pushes carry the hub they
 *  were launched from forward via location state, so back/forward only ever
 *  replays a real push/pop sequence and never jumps across an unrelated tab.
 */

type HubState = { hub?: string };

function fallbackHub(pathname: string): string {
  if (pathname === "/" || pathname.startsWith("/events")) return "events";
  if (pathname.startsWith("/alerts")) return "alerts";
  if (pathname.startsWith("/profile")) return "profile";
  if (pathname.startsWith("/admin")) return "admin";
  return pathname;
}

/** Hub of a location: whatever hub it was pushed from, or a path-based guess. */
export function getHub(location: { pathname: string; state?: unknown }): string {
  const state = location.state as HubState | null;
  return state?.hub ?? fallbackHub(location.pathname);
}

/** Location `state` to pass on a push navigation so it stays inside the current hub. */
export function hubState(location: { pathname: string; state?: unknown }): HubState {
  return { hub: getHub(location) };
}
