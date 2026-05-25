// HostConfig for the C++ shadow-tree renderer. Every callback that mutates
// the tree forwards directly to a JSI host function on `globalThis.__RNW_UI`.
// Instances are opaque integer tags — the same model Fabric uses for its
// native nodes — so the JS side never holds a parallel tree.
//
// We deliberately don't import `HostConfig` from `react-reconciler`. The
// generic signature drifts every minor version (0.28 → 0.29 → 0.32 each
// rearranged params) and chasing those changes adds no value here. The
// reconciler only ever calls the methods below positionally.

type Tag = number;
type Container = object; // inert sentinel — the C++ side owns the root list
// Type is the SwiftUI view name passed as-is through the C++ shadow
// tree to the Swift `RNWViewRegistry`. Any string is valid here — an
// unregistered view falls back to EmptyView on the Swift side rather
// than failing at the reconciler boundary.
type Type = string;
type Props = Record<string, unknown>;

interface UIManager {
  createNode(type: Type, props: Props): Tag;
  createTextNode(text: string): Tag;
  updateNodeProps(tag: Tag, newProps: Props): void;
  updateTextNode(tag: Tag, text: string): void;
  appendChild(parent: Tag, child: Tag): void;
  insertBefore(parent: Tag, child: Tag, before: Tag): void;
  removeChild(parent: Tag, child: Tag): void;
  appendToRoot(child: Tag): void;
  removeFromRoot(child: Tag): void;
  clearRoot(): void;
  completeRoot(): void;
}

// `globalThis.__RNW_UI` is installed by RNWHermesHost when the runtime
// boots. If the JS side imports the renderer before the host is wired
// (e.g. unit tests under Node), throw with a clear message.
function ui(): UIManager {
  const g = globalThis as unknown as { __RNW_UI?: UIManager };
  if (!g.__RNW_UI) {
    throw new Error(
      '@appsent-co/react-native-watchos: __RNW_UI host object is not installed. ' +
        'This renderer only runs inside the watchOS Hermes runtime.'
    );
  }
  return g.__RNW_UI;
}

// `setTimeout`/`clearTimeout` aren't in the project's `lib` (ESNext only),
// so reference them off `globalThis` to dodge the missing global types.
const g = globalThis as unknown as {
  setTimeout: (cb: () => void, ms?: number) => number;
  clearTimeout: (id: number) => void;
};

// react-reconciler 0.32 (React 19) splits the old `getCurrentEventPriority`
// into get/set/resolve. Lanes are bitmasks, matching the constants exported
// from react-reconciler/constants:
//   NoEventPriority = 0, DiscreteEventPriority = 2,
//   ContinuousEventPriority = 8, DefaultEventPriority = 32.
// We don't dispatch real events on watchOS yet, so a single module-level
// slot is enough. resolveUpdatePriority is the function requestUpdateLane
// invokes at render time; returning undefined here is what produced the
// "undefined is not a function" crash in requestUpdateLane.
const NoEventPriority = 0;
const DefaultEventPriority = 32;
let currentUpdatePriority: number = NoEventPriority;

export function createHostConfig(): Record<string, unknown> {
  return {
    supportsMutation: true,
    supportsPersistence: false,
    isPrimaryRenderer: true,
    supportsHydration: false,

    createInstance(type: Type, props: Props): Tag {
      return ui().createNode(type, props);
    },
    createTextInstance(text: string): Tag {
      return ui().createTextNode(text);
    },

    appendInitialChild(parent: Tag, child: Tag) {
      ui().appendChild(parent, child);
    },
    appendChild(parent: Tag, child: Tag) {
      ui().appendChild(parent, child);
    },
    appendChildToContainer(_container: Container, child: Tag) {
      ui().appendToRoot(child);
    },

    insertBefore(parent: Tag, child: Tag, before: Tag) {
      ui().insertBefore(parent, child, before);
    },
    insertInContainerBefore(_container: Container, child: Tag, _before: Tag) {
      // No real "before" semantics on root; treat as append for MVP.
      ui().appendToRoot(child);
    },

    removeChild(parent: Tag, child: Tag) {
      ui().removeChild(parent, child);
    },
    removeChildFromContainer(_container: Container, child: Tag) {
      ui().removeFromRoot(child);
    },

    clearContainer(_container: Container) {
      ui().clearRoot();
    },

    // react-reconciler 0.32 dropped `prepareUpdate` and removed the
    // `updatePayload` arg from `commitUpdate`. Signature is now
    // `(instance, type, oldProps, newProps, internalHandle)`. Keeping the
    // old 5-arg `(tag, payload, type, oldProps, newProps)` shape silently
    // swaps oldProps↔newProps and every re-render forwards the *previous*
    // props to native — useState/setInterval appear to fire but never
    // change the screen.
    commitUpdate(tag: Tag, _type: Type, _oldProps: Props, newProps: Props) {
      ui().updateNodeProps(tag, newProps);
    },
    commitTextUpdate(tag: Tag, _oldText: string, newText: string) {
      ui().updateTextNode(tag, newText);
    },

    finalizeInitialChildren(): boolean {
      return false;
    },
    shouldSetTextContent(): boolean {
      return false;
    },

    getRootHostContext() {
      return {};
    },
    getChildHostContext() {
      return {};
    },
    getPublicInstance(tag: Tag): Tag {
      return tag;
    },

    prepareForCommit(): null {
      return null;
    },
    resetAfterCommit(_container: Container) {
      ui().completeRoot();
    },

    preparePortalMount() {
      // unused
    },

    now: Date.now,
    scheduleTimeout: g.setTimeout,
    cancelTimeout: g.clearTimeout,
    noTimeout: -1,

    // Priority APIs (react-reconciler 0.32). requestUpdateLane calls
    // resolveUpdatePriority synchronously on every state update; if it's
    // missing the reconciler crashes with "undefined is not a function"
    // before ever reaching the host methods above.
    getCurrentUpdatePriority(): number {
      return currentUpdatePriority;
    },
    setCurrentUpdatePriority(priority: number) {
      currentUpdatePriority = priority;
    },
    resolveUpdatePriority(): number {
      return currentUpdatePriority !== NoEventPriority
        ? currentUpdatePriority
        : DefaultEventPriority;
    },
    shouldAttemptEagerTransition(): boolean {
      return false;
    },

    // Suspense-on-commit hooks. Called during render/commit even when the
    // tree contains no <Suspense>, so they must exist. We don't suspend.
    maySuspendCommit(): boolean {
      return false;
    },
    preloadInstance(): boolean {
      return true;
    },
    startSuspendingCommit() {},
    suspendInstance() {},
    waitForCommitToBeReady(): null {
      return null;
    },

    // Form/transition plumbing. HostTransitionContext is read via
    // readContext() inside useFormState etc.; the reconciler also writes
    // to its `_currentValue`/`_currentValue2` slots, so it must be a real
    // object. NotPendingTransition is the sentinel stored in those slots
    // when no transition is active — any stable reference works.
    NotPendingTransition: null,
    HostTransitionContext: {
      $$typeof: Symbol.for('react.context'),
      Provider: null,
      Consumer: null,
      _currentValue: null,
      _currentValue2: null,
      _threadCount: 0,
      _defaultValue: null,
      _globalName: null,
    },
    resetFormInstance() {},

    // No-ops below — required by the HostConfig contract but irrelevant
    // for a non-interactive, non-suspense renderer.
    commitMount() {},
    detachDeletedInstance() {},
    getInstanceFromNode() {
      return null;
    },
    beforeActiveInstanceBlur() {},
    afterActiveInstanceBlur() {},
    prepareScopeUpdate() {},
    getInstanceFromScope() {
      return null;
    },
  };
}
