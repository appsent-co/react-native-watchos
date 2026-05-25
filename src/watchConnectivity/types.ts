export type ActivationState = 'notActivated' | 'inactive' | 'activated';

export type JSONValue =
  | null
  | boolean
  | number
  | string
  | { [k: string]: JSONValue }
  | JSONValue[];

export type Dictionary = { [key: string]: JSONValue };

export interface SessionState {
  activationState: ActivationState;
  isReachable: boolean;
  /** iOS-only — `false` when read on the watch side. */
  isPaired: boolean;
  /** iOS-only — `false` when read on the watch side. */
  isWatchAppInstalled: boolean;
  /** Watch-only — `false` when read on the iOS side. */
  isCompanionAppInstalled: boolean;
}

export interface ReceivedMessage {
  content: Dictionary;
  /** Present iff the peer expects a reply. Facade hides this from
   *  handlers — return a value from the handler to trigger the reply. */
  replyId?: string;
}

export interface ReceivedMessageData {
  /** Base64-encoded payload. */
  data: string;
  replyId?: string;
}

export interface UserInfoTransfer {
  id: string;
  userInfo: Dictionary;
}

export type SendMessageOptions = {
  /** When `true`, the returned promise resolves with the peer's reply
   *  payload. When `false` (default), the promise resolves once the OS
   *  has accepted the message — there's no acknowledgement protocol. */
  expectReply?: boolean;
  /** WCSession has no built-in reply timeout. The facade rejects the
   *  promise after this many ms when `expectReply` is `true`. Default
   *  30,000 ms; set `0` to disable. */
  timeoutMs?: number;
};

export type Subscription = { remove(): void };

export type EventMap = {
  message: (m: ReceivedMessage) => Dictionary | Promise<Dictionary> | void;
  messageData: (m: ReceivedMessageData) => string | Promise<string> | void;
  applicationContext: (ctx: Dictionary) => void;
  userInfo: (info: Dictionary) => void;
  reachabilityChanged: (reachable: boolean) => void;
  stateChanged: (state: SessionState) => void;
};

export type EventName = keyof EventMap;
