import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// Shipped from the library so iOS RN codegen (driven by the package-level
// `codegenConfig` in `package.json`) discovers it from
// `node_modules/@appsent-co/react-native-watchos/src/watchConnectivity/specs/`. The
// watch-side codegen plugin (`withWatchTurboModuleCodegen`) ALSO scans
// this directory so the same spec produces the watch target's umbrella
// header.

export interface SessionState {
  activationState: string; // 'notActivated' | 'inactive' | 'activated'
  isReachable: boolean;
  isPaired: boolean; // iOS only — false on watch
  isWatchAppInstalled: boolean; // iOS only — false on watch
  isCompanionAppInstalled: boolean; // watch only — false on iOS
}

export interface UserInfoTransfer {
  id: string;
  userInfo: Object;
}

export interface Spec extends TurboModule {
  activate(): Promise<SessionState>;
  getState(): Promise<SessionState>;

  sendMessage(
    message: Object,
    expectReply: boolean,
    timeoutMs: number
  ): Promise<Object | null>;
  sendMessageData(
    base64: string,
    expectReply: boolean,
    timeoutMs: number
  ): Promise<string | null>;

  replyToMessage(replyId: string, payload: Object): void;
  replyToMessageData(replyId: string, base64: string): void;

  updateApplicationContext(context: Object): Promise<void>;
  getApplicationContext(): Promise<Object>;
  getReceivedApplicationContext(): Promise<Object>;

  transferUserInfo(info: Object): Promise<{ id: string }>;
  outstandingUserInfoTransfers(): Promise<UserInfoTransfer[]>;

  // No-op stubs for iOS NativeEventEmitter contract; the watch side
  // routes through `globalThis.__RNW_EVENTS.dispatchEvent` (name-keyed
  // fan-out in the JS-side shim) and ignores these on both platforms.
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('WatchConnectivity');
