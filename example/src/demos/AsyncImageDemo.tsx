import {
  AsyncImage,
  HStack,
  Image,
  ProgressView,
  Text,
  VStack,
  font,
  foregroundColor,
  frame,
  resizable,
  scaledToFit,
} from '@appsent-co/react-native-watchos/renderer';

/// Exercises the phase-driven `AsyncImage` API. Loads a deliberately
/// large source (400x400) into a 60x60 frame so the loaded-image
/// `resizable() + aspectRatio('fit')` chain is visible.
const URL = 'https://picsum.photos/400/400';

export function AsyncImageDemo() {
  return (
    <VStack>
      <HStack>
        <AsyncImage
          url={URL}
          modifiers={[frame({ width: 60, height: 60 })]}
        >
          <AsyncImage.Empty>
            <ProgressView />
          </AsyncImage.Empty>
          <AsyncImage.Success>
            <AsyncImage.Image modifiers={[resizable(), scaledToFit()]} />
          </AsyncImage.Success>
          <AsyncImage.Failure>
            <Image
              systemName="exclamationmark.triangle"
              modifiers={[foregroundColor('red')]}
            />
          </AsyncImage.Failure>
        </AsyncImage>

        <VStack>
          <Text modifiers={[font({ style: 'caption' })]}>fit</Text>
          <Text
            modifiers={[
              font({ style: 'caption' }),
              foregroundColor('secondary'),
            ]}
          >
            400→60
          </Text>
        </VStack>
      </HStack>

      <Text modifiers={[font({ style: 'caption' })]}>
        Bare AsyncImage (no phase slots) — intrinsic size, system spinner:
      </Text>
      <AsyncImage url="https://picsum.photos/40/40" />
    </VStack>
  );
}
