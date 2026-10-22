import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/** false during SSR and before hydration, true once React controls the page (buttons work). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
