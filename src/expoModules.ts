/** Non-UI entry for expo-modules-core, selected only by watchOS Metro. */
import type { ExpoGlobal } from 'expo-modules-core';

export { default as uuid } from 'expo-modules-core/src/uuid';
export type {
  EventSubscription,
  PermissionResponse,
  PermissionExpiration,
} from 'expo-modules-core';

type Events = Record<string, (...args: any[]) => void>;

function installedRuntime(): typeof ExpoGlobal {
  const runtime = globalThis.expo;
  if (
    !runtime?.modules ||
    ['NativeModule', 'EventEmitter', 'SharedObject', 'SharedRef'].some(
      (name) =>
        typeof (runtime as unknown as Record<string, unknown>)[name] !==
        'function'
    )
  ) {
    throw new Error(
      'Expo modules are not installed in this watch runtime. Enable expoModules in the react-native-watchos plugin, then prebuild and rebuild the watch app.'
    );
  }
  return runtime;
}

// These constructors are the genuine classes installed by Expo's JSI runtime.
// Never create stand-ins: native identity and finalization depend on them.
const runtime = installedRuntime();
export const NativeModule = runtime.NativeModule;
export type NativeModule<T extends Events = Record<never, never>> =
  import('expo-modules-core').NativeModule<T>;
export const EventEmitter = runtime.EventEmitter;
export type EventEmitter<T extends Events = Record<never, never>> =
  import('expo-modules-core').EventEmitter<T>;
export const SharedObject = runtime.SharedObject;
export type SharedObject<T extends Events = Record<never, never>> =
  import('expo-modules-core').SharedObject<T>;
export const SharedRef = runtime.SharedRef;
export type SharedRef<
  T extends string = 'unknown',
  E extends Events = Record<never, never>,
> = import('expo-modules-core').SharedRef<T, E>;

export function requireOptionalNativeModule<T = any>(name: string): T | null {
  return installedRuntime().modules[name] ?? null;
}

export function requireNativeModule<T = any>(name: string): T {
  const module = requireOptionalNativeModule<T>(name);
  if (module == null) {
    throw new Error(
      `Cannot find native module '${name}' in this watch app. Ensure its package declares watchOS support, then prebuild and rebuild.`
    );
  }
  return module;
}

export class CodedError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export class UnavailabilityError extends CodedError {
  constructor(moduleName: string, propertyName: string) {
    super(
      'ERR_UNAVAILABLE',
      `${moduleName}.${propertyName} is not available on watchos.`
    );
  }
}

export const Platform = {
  OS: 'watchos' as const,
  select<T>(values: { watchos?: T; native?: T; default?: T }): T | undefined {
    if ('watchos' in values) return values.watchos;
    if ('native' in values) return values.native;
    return values.default;
  },
  isDOMAvailable: false,
  canUseEventListeners: false,
  canUseViewport: false,
  isAsyncDebugging: false,
};

export enum PermissionStatus {
  GRANTED = 'granted',
  UNDETERMINED = 'undetermined',
  DENIED = 'denied',
}

export function requireNativeViewManager(): never {
  throw new UnavailabilityError('ExpoModulesCore', 'requireNativeViewManager');
}

export function installOnUIRuntime(): never {
  throw new UnavailabilityError('ExpoModulesCore', 'installOnUIRuntime');
}
