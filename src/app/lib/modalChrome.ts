/** Tracks how many ModalOverlay instances are currently mounted, so MainLayout
 *  can hide the mobile top header / bottom nav while any modal is open (they'd
 *  otherwise sit on top of the backdrop and block taps meant for the modal).
 *  A counter, not a bool, because a confirm can stack on top of another modal.
 */
type Listener = () => void;
let count = 0;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach(l => l());
}

export function registerModalOpen(): () => void {
  count++;
  emit();
  return () => {
    count--;
    emit();
  };
}

export function subscribeModalOpen(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getModalOpenSnapshot(): boolean {
  return count > 0;
}
