type Listener = (status: 401 | 403) => void;
const unauthorizedListeners = new Set<Listener>();

/** Fired by the API client on 401; AuthProvider clears state and opens the login modal. */
export function onUnauthorized(fn: Listener) {
  unauthorizedListeners.add(fn);
  return () => unauthorizedListeners.delete(fn);
}
export function emitUnauthorized(status: 401 | 403 = 401) {
  unauthorizedListeners.forEach((fn) => fn(status));
}
