import { useSyncExternalStore } from "react";
import { subscribeModalOpen, getModalOpenSnapshot } from "./modalChrome";

/** True while at least one ModalOverlay is mounted anywhere in the app. */
export function useModalOpen(): boolean {
  return useSyncExternalStore(subscribeModalOpen, getModalOpenSnapshot);
}
