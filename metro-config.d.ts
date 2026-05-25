export interface MetroResolverConfig {
  platforms?: string[];
  unstable_conditionsByPlatform?: { [platform: string]: string[] };
  [key: string]: unknown;
}

export interface MetroConfigLike {
  resolver?: MetroResolverConfig;
  [key: string]: unknown;
}

/**
 * Mutates and returns the given Metro config so that `watchos` is a known
 * resolver platform. Once registered, Metro resolves
 * `foo.watchos.{ts,tsx,js,jsx}` before falling back to `foo.{ts,tsx,js,jsx}`
 * whenever a bundle is requested with `?platform=watchos`.
 *
 * Idempotent: safe to call more than once on the same config.
 */
export function withWatchosMetro<T extends MetroConfigLike>(config: T): T;

declare const _default: typeof withWatchosMetro;
export default _default;
