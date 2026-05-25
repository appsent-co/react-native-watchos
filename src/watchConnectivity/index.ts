// JavaScript-friendly facade over Apple's WatchConnectivity (WCSession).
//
// Same API on iOS and watchOS. Same code runs in the iOS host app's
// React Native runtime and in the watchOS Hermes runtime — the native
// side picks the right delegate methods to fire based on which side
// of the pairing it's on.
//
// Usage:
//
//   import { WatchConnectivity } from '@appsent-co/react-native-watchos/watch-connectivity';
//
//   await WatchConnectivity.activate();
//
//   // Subscribe to incoming messages. Return a value from the handler
//   // to reply (when the peer used `expectReply: true`).
//   const sub = WatchConnectivity.on('message', ({ content }) => {
//     return { pong: content.ping };
//   });
//
//   // Send and wait for a reply.
//   const reply = await WatchConnectivity.sendMessage(
//     { ping: Date.now() },
//     { expectReply: true }
//   );
//
//   sub.remove();

import NativeWatchConnectivity from './specs/NativeWatchConnectivity';
import { createEventBridge } from './eventBridge';
import type {
  Dictionary,
  EventMap,
  EventName,
  ReceivedMessage,
  ReceivedMessageData,
  SendMessageOptions,
  SessionState,
  Subscription,
  UserInfoTransfer,
} from './types';

export type {
  ActivationState,
  Dictionary,
  EventMap,
  EventName,
  JSONValue,
  ReceivedMessage,
  ReceivedMessageData,
  SendMessageOptions,
  SessionState,
  Subscription,
  UserInfoTransfer,
} from './types';

const DEFAULT_TIMEOUT_MS = 30_000;

const bridge = createEventBridge(
  NativeWatchConnectivity as unknown as {
    addListener?(name: string): void;
    removeListeners?(n: number): void;
  }
);

export const WatchConnectivity = {
  /** Activate `WCSession.default` and set the module as its delegate.
   *  Idempotent — calling twice is safe. Resolves with the current
   *  session state once activation is requested (note: the actual
   *  `activated` state may arrive asynchronously via `'stateChanged'`). */
  activate(): Promise<SessionState> {
    return NativeWatchConnectivity.activate() as Promise<SessionState>;
  },

  /** Snapshot of the current `WCSession` state. */
  getState(): Promise<SessionState> {
    return NativeWatchConnectivity.getState() as Promise<SessionState>;
  },

  /** Send an immediate message to the peer. Peer must be reachable.
   *  When `expectReply: true`, resolves with the peer's reply payload;
   *  otherwise resolves once the OS accepts the send. */
  async sendMessage(
    message: Dictionary,
    opts?: SendMessageOptions
  ): Promise<Dictionary | undefined> {
    const expectReply = opts?.expectReply ?? false;
    const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const result = (await NativeWatchConnectivity.sendMessage(
      message,
      expectReply,
      timeoutMs
    )) as Dictionary | null;
    return result ?? undefined;
  },

  /** Binary equivalent of `sendMessage`. Payload is base64-encoded on
   *  the wire — callers must encode/decode themselves. */
  async sendMessageData(
    base64: string,
    opts?: SendMessageOptions
  ): Promise<string | undefined> {
    const expectReply = opts?.expectReply ?? false;
    const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const result = (await NativeWatchConnectivity.sendMessageData(
      base64,
      expectReply,
      timeoutMs
    )) as string | null;
    return result ?? undefined;
  },

  /** Last-write-wins persistent context shared with the peer. The peer
   *  reads it via `getReceivedApplicationContext()` or the
   *  `'applicationContext'` event. Survives app restarts. */
  updateApplicationContext(context: Dictionary): Promise<void> {
    return NativeWatchConnectivity.updateApplicationContext(
      context
    ) as Promise<void>;
  },

  /** The context this side most recently pushed via
   *  `updateApplicationContext` (may not have been delivered yet). */
  getApplicationContext(): Promise<Dictionary> {
    return NativeWatchConnectivity.getApplicationContext() as Promise<Dictionary>;
  },

  /** The latest context this side received from the peer. Persists
   *  across launches — querying immediately after `activate()` returns
   *  the value last delivered while the app was running or backgrounded. */
  getReceivedApplicationContext(): Promise<Dictionary> {
    return NativeWatchConnectivity.getReceivedApplicationContext() as Promise<Dictionary>;
  },

  /** Queue an opaque dictionary for background delivery to the peer.
   *  Survives reboots; delivered FIFO when the peer is reachable. */
  transferUserInfo(info: Dictionary): Promise<{ id: string }> {
    return NativeWatchConnectivity.transferUserInfo(info) as Promise<{
      id: string;
    }>;
  },

  /** Transfers this side has enqueued but the peer hasn't acknowledged. */
  outstandingUserInfoTransfers(): Promise<UserInfoTransfer[]> {
    return NativeWatchConnectivity.outstandingUserInfoTransfers() as Promise<
      UserInfoTransfer[]
    >;
  },

  /** Subscribe to an event. Returns a `Subscription` whose `.remove()`
   *  unsubscribes the listener. For `'message'` and `'messageData'`,
   *  return a value from the handler (or a promise resolving to one)
   *  to reply when the peer used `expectReply: true`. */
  on<E extends EventName>(event: E, handler: EventMap[E]): Subscription {
    if (event === 'message') {
      return bridge.subscribe('message', (payload) => {
        const msg = payload as ReceivedMessage;
        const result = (handler as EventMap['message'])(msg);
        if (msg.replyId == null) return;
        Promise.resolve(result).then(
          (value) => {
            if (value == null) return;
            NativeWatchConnectivity.replyToMessage(
              msg.replyId!,
              value as Dictionary
            );
          },
          () => {
            // Swallow — there's no way to surface a reply-handler throw
            // back to the peer. The peer will time out instead.
          }
        );
      });
    }
    if (event === 'messageData') {
      return bridge.subscribe('messageData', (payload) => {
        const msg = payload as ReceivedMessageData;
        const result = (handler as EventMap['messageData'])(msg);
        if (msg.replyId == null) return;
        Promise.resolve(result).then(
          (value) => {
            if (value == null) return;
            NativeWatchConnectivity.replyToMessageData(
              msg.replyId!,
              value as string
            );
          },
          () => undefined
        );
      });
    }
    return bridge.subscribe(event, handler as (p: unknown) => void);
  },
};

export default WatchConnectivity;
