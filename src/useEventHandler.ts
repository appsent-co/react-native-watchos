import { useEffect, useRef, useState } from 'react';

import { registerHandler, unregisterHandler } from './eventRegistry';

/// Bridge a JS function into a stable native-friendly numeric id.
///
/// - Allocates the id once (in `useState`'s initializer) and keeps it
///   stable across re-renders. Otherwise every keystroke / state change
///   would churn the registry and leave stale entries.
/// - The actual callback target is kept in a ref so re-renders with
///   different closures take effect immediately, without re-allocation.
/// - Returns `undefined` when `fn` is `undefined`, so the component can
///   omit the prop and the native side won't see a dangling event id.
/// - Frees the id on unmount.
export function useEventHandler<P = void>(
  fn: ((payload: P) => void) | undefined
): number | undefined {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const [id] = useState(() =>
    registerHandler((payload) => {
      const current = fnRef.current;
      if (current !== undefined) current(payload as P);
    })
  );

  useEffect(() => () => unregisterHandler(id), [id]);

  return fn === undefined ? undefined : id;
}
