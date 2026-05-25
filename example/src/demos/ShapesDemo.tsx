import {
  Capsule,
  Circle,
  Rectangle,
  RoundedRectangle,
  VStack,
  foregroundColor,
  frame,
} from '@appsent-co/react-native-watchos/renderer';

/// Smoke-test for the four SwiftUI shape primitives. Each shape is
/// sized + tinted so the reviewer can eyeball that the bridge is
/// wired and that the corner-radius prop on RoundedRectangle lands.
export function ShapesDemo() {
  const sizing = [frame({ width: 40, height: 40 }), foregroundColor('red')];
  return (
    <VStack spacing={8}>
      <Rectangle modifiers={sizing} />
      <RoundedRectangle cornerRadius={8} modifiers={sizing} />
      <Circle modifiers={sizing} />
      <Capsule modifiers={sizing} />
    </VStack>
  );
}
