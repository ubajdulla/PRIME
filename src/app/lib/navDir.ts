/** Navigation direction tracker.
 *  Set *before* calling navigate(); read during the next page render.
 *  0 = no slide animation (navbar / sub-navbar clicks)
 *  1 = forward  (slide in from right)
 * -1 = back     (slide in from left)
 */
export type NavDir = 1 | -1 | 0;
let _dir: NavDir = 1;

export const navDir = {
  get:     (): NavDir => _dir,
  forward: () => { _dir =  1; },
  back:    () => { _dir = -1; },
  none:    () => { _dir =  0; },  // skip animation
};
