// Turns the integer returned by `require('./foo.png')` into a `{ uri,
// width, height, scale }` object the native `Image` view can load.
//
// Metro's asset transformer rewrites `require('./foo.png')` to a call
// to `@react-native/assets-registry/registry.registerAsset(...)` and
// uses the returned id as the module's value. We reverse the lookup at
// render time, then build a URI:
//
//   - dev  : `http://<metro-host>:<port>/<httpServerLocation>/<name>.<type>`
//            using `globalThis.__RNW_DEV_SERVER` (injected by the Swift
//            host before the bundle evaluates — see
//            `apple/Sources/ReactNativeWatchOS/ReactNativeWatchOS.swift`,
//            `devServerInjection(for:)`).
//   - prod : a bundle-relative path the native side resolves against
//            `Bundle.main.bundleURL`. The watchOS Run Script in
//            `plugin/src/withWatchBundleScript.js` passes `--assets-dest`
//            to `expo export:embed`, which copies the file under the
//            `.app` mirroring its `httpServerLocation` layout.

declare const __DEV__: boolean;
declare const require: (id: string) => unknown;

interface PackagedAsset {
  httpServerLocation: string;
  name: string;
  type: string;
  scales: number[];
  hash: string;
  width: number;
  height: number;
}

interface AssetRegistryModule {
  getAssetByID(id: number): PackagedAsset | undefined;
}

interface DevServer {
  scheme: string;
  host: string;
  port: number;
}

export interface ResolvedAssetSource {
  uri: string;
  width: number;
  height: number;
  scale: number;
}

let cachedRegistry: AssetRegistryModule | null | undefined;

function loadRegistry(): AssetRegistryModule | null {
  if (cachedRegistry !== undefined) return cachedRegistry;
  try {
    cachedRegistry = require(
      '@react-native/assets-registry/registry'
    ) as AssetRegistryModule;
  } catch {
    cachedRegistry = null;
  }
  return cachedRegistry;
}

export function resolveAssetSource(id: number): ResolvedAssetSource | null {
  const registry = loadRegistry();
  if (!registry) return null;
  const asset = registry.getAssetByID(id);
  if (!asset) return null;

  const scale = asset.scales[0] ?? 1;
  const fileName =
    scale === 1
      ? `${asset.name}.${asset.type}`
      : `${asset.name}@${scale}x.${asset.type}`;
  const path = asset.httpServerLocation.replace(/^\/+/, '');

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    const dev = (globalThis as { __RNW_DEV_SERVER?: DevServer })
      .__RNW_DEV_SERVER;
    if (!dev) return null;
    return {
      uri:
        `${dev.scheme}://${dev.host}:${dev.port}/${path}/${asset.name}.${asset.type}` +
        `?platform=watchos&hash=${asset.hash}`,
      width: asset.width,
      height: asset.height,
      scale,
    };
  }

  return {
    uri: `${path}/${fileName}`,
    width: asset.width,
    height: asset.height,
    scale,
  };
}
