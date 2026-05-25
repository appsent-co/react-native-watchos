import {
  Group,
  Text,
  VStack,
  background,
  padding,
} from '@appsent-co/react-native-watchos/renderer';

/// Demonstrates `<Group>` applying `padding` + `background` to two sibling
/// `<Text>`s as a single unit, without introducing a stack of its own.
export function GroupDemo() {
  return (
    <VStack>
      <Group modifiers={[padding(8), background('red')]}>
        <Text>A</Text>
        <Text>B</Text>
      </Group>
    </VStack>
  );
}
