import {
  createElement,
  isValidElement,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';

import { registerHandler, unregisterHandler } from './eventRegistry';
import type { ViewModifier } from './types';

type AnyFn = (payload?: unknown) => void;

interface ModifierState {
  /// `${modifierIndex}:${paramKey}` → native handler id (kept stable across
  /// renders so the registry doesn't churn on every keystroke / state change).
  ids: Map<string, number>;
  /// Same key → the latest JS callback. Updated every render so the
  /// registered dispatcher always invokes the current closure.
  fns: Map<string, AnyFn>;
}

/// Process a view's `modifiers` prop so callback and content modifiers can
/// cross the bridge. Plain value modifiers pass through untouched.
///
///   - **Callbacks.** A modifier param whose value is a function is replaced
///     with a stable numeric handler id. This is mandatory: the JSI → NS
///     converter drops raw functions, so a callback left as a function would
///     silently never fire. The id is allocated once and freed on unmount;
///     the live closure lives in a ref so re-renders take effect without
///     re-allocating. Native fires it via `RNWModifierContext.fire`.
///   - **Content.** A param whose value is a React element (or array of
///     elements) is hoisted into a `__ModifierContent` child node carrying a
///     `slot` prop, and the param value is replaced with that slot id string.
///     This also avoids feeding a React element (whose `_owner` fiber graph
///     is cyclic) to the recursive bridge converter. Native pulls the
///     rendered content back via `RNWModifierContext.content(slot)`; the
///     hoisted node is excluded from inline children (`viewChildren`).
///
/// The hook-count is fixed regardless of modifier count, so this is safe to
/// call unconditionally from any component.
export function useModifiers(
  modifiers: ViewModifier[] | undefined,
  children: ReactNode
): { modifiers: ViewModifier[] | undefined; children: ReactNode } {
  const state = useRef<ModifierState>({ ids: new Map(), fns: new Map() });

  // Free every outstanding handler id on unmount. Capture `state.current`
  // here so the cleanup doesn't read a possibly-changed ref later.
  useEffect(() => {
    const s = state.current;
    return () => {
      for (const id of s.ids.values()) unregisterHandler(id);
      s.ids.clear();
      s.fns.clear();
    };
  }, []);

  if (!modifiers || modifiers.length === 0) {
    return { modifiers, children };
  }

  const s = state.current;
  const seen = new Set<string>();
  const contentChildren: ReactNode[] = [];

  const processed = modifiers.map((mod, i) => {
    let out: Record<string, unknown> | undefined;

    for (const key of Object.keys(mod)) {
      if (key === '$type') continue;
      const value = (mod as Record<string, unknown>)[key];

      if (typeof value === 'function') {
        const mapKey = `${i}:${key}`;
        seen.add(mapKey);
        let id = s.ids.get(mapKey);
        if (id === undefined) {
          id = registerHandler((payload) => {
            const fn = s.fns.get(mapKey);
            if (fn) fn(payload);
          });
          s.ids.set(mapKey, id);
        }
        s.fns.set(mapKey, value as AnyFn);
        out = out ?? { ...mod };
        out[key] = id;
      } else if (
        isValidElement(value) ||
        (Array.isArray(value) && value.some((v) => isValidElement(v)))
      ) {
        const slot = `__mc:${i}:${key}`;
        contentChildren.push(
          createElement('__ModifierContent', { key: slot, slot }, value as ReactNode)
        );
        out = out ?? { ...mod };
        out[key] = slot;
      }
    }

    return (out ?? mod) as ViewModifier;
  });

  // Release ids whose (modifier, key) pair vanished this render — a modifier
  // was removed or its callback prop dropped.
  for (const [mapKey, id] of s.ids) {
    if (!seen.has(mapKey)) {
      unregisterHandler(id);
      s.ids.delete(mapKey);
      s.fns.delete(mapKey);
    }
  }

  if (contentChildren.length === 0) {
    return { modifiers: processed, children };
  }

  const base: ReactNode[] =
    children == null || children === false
      ? []
      : Array.isArray(children)
        ? children
        : [children];

  return { modifiers: processed, children: [...base, ...contentChildren] };
}
