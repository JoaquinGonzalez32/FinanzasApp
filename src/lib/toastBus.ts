/**
 * Module-level toast bus.
 *
 * Lets non-component code (e.g. a fire-and-forget mutation that resolves after
 * its originating screen has unmounted) surface a toast through the single
 * root-mounted host. Unlike a React Context, this is reachable from plain
 * promises and services.
 *
 * Single-listener model: the root host subscribes once; the latest subscriber
 * wins. Unsubscribing only clears the slot if it still holds that listener, so
 * a stale unsubscribe can't silence the active host.
 */
export interface ToastBusConfig {
  type: string;
  message: string;
  action?: string;
  onAction?: () => void;
  duration?: number;
}

type Listener = (config: ToastBusConfig) => void;

let current: Listener | null = null;

export const toastBus = {
  show(config: ToastBusConfig): void {
    current?.(config);
  },
  subscribe(listener: Listener): () => void {
    current = listener;
    return () => {
      if (current === listener) current = null;
    };
  },
};
