import {
  Image,
  Text,
  VStack,
  font,
  foregroundColor,
  frame,
  resizable,
  scaledToFit,
} from '@appsent-co/react-native-watchos/renderer';

/// `<Image source={require(...)} />` — Metro's asset transformer rewrites
/// the `require` to a `registerAsset` call returning a numeric id, and
/// the JS-side `resolveAssetSource` turns that id into a uri the native
/// side loads (dev: Metro asset URL, prod: bundle-relative path).
export function LocalImageDemo() {
  return (
    <VStack>
      <Image
        source={require('../assets/logo.png')}
        modifiers={[
          resizable(),
          scaledToFit(),
          frame({ width: 100, height: 100 }),
        ]}
      />
      <Text
        modifiers={[font({ style: 'caption' }), foregroundColor('secondary')]}
      >
        require(&apos;./logo.png&apos;)
      </Text>
    </VStack>
  );
}
