import { useState } from 'react';
import {
  Button,
  Text,
  VStack,
  font,
  foregroundStyle,
  padding,
  sheet,
} from '@appsent-co/react-native-watchos/renderer';

/// Smoke test for the `sheet` modifier — exercises the modifier foundation's
/// content hoisting (the sheet body crosses the bridge as a hidden
/// `__ModifierContent` child and is pulled back via `ctx.content`) and the
/// two-way `isPresented` binding. Tapping "Open sheet" presents the body;
/// the status line proves the `onChange` round-trip fires on both the
/// programmatic "Done" close and an interactive swipe-down dismiss.
export function SheetDemo() {
  const [open, setOpen] = useState(false);

  return (
    <VStack
      spacing={8}
      modifiers={[
        sheet({
          isPresented: open,
          // Keeps JS state in sync — required so a swipe-down dismiss
          // reports back rather than leaving `open` stuck at true.
          onChange: setOpen,
          content: (
            <VStack spacing={12} modifiers={[padding(16)]}>
              <Text modifiers={[font({ style: 'headline' })]}>
                Sheet content
              </Text>
              <Text modifiers={[foregroundStyle('secondary')]}>
                This whole view tree is presented modally.
              </Text>
              <Button onPress={() => setOpen(false)}>
                <Text>Done</Text>
              </Button>
            </VStack>
          ),
        }),
      ]}
    >
      <Text>{open ? 'Sheet: open' : 'Sheet: closed'}</Text>
      <Button onPress={() => setOpen(true)}>
        <Text>Open sheet</Text>
      </Button>
    </VStack>
  );
}
