---
title: Sheet (modal presentation)
sidebar_position: 4
---

# Sheet

`sheet` is a **modifier**, not a component — it matches SwiftUI's
`.sheet(isPresented:onDismiss:content:)`. Apply it to any view and
provide the modal content as a React node.

The presentation binding is **two-way**: JS owns the source of
truth, and an interactive (swipe-down) dismiss reports back to JS
via `onChange`.

```tsx
import { useState } from 'react';
import {
  VStack,
  Button,
  Text,
  sheet,
} from '@appsent-co/react-native-watchos/renderer';

function App() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <VStack
      modifiers={[
        sheet({
          isPresented: showSettings,
          onChange: setShowSettings,
          content: <SettingsScreen onDone={() => setShowSettings(false)} />,
        }),
      ]}
    >
      <Button onPress={() => setShowSettings(true)}>
        <Text>Settings</Text>
      </Button>
    </VStack>
  );
}
```

## Params

| Param | Type | Notes |
| --- | --- | --- |
| `isPresented` | `boolean` | Whether the sheet is shown. |
| `onChange` | `(isPresented: boolean) => void` | Fires when presentation state changes — including the user dismissing interactively. |
| `content` | `ReactNode` | The sheet's content tree. |

## Decorating the sheet

Sheets can be styled with the presentation modifier family. Apply
these to the **content** view (not the presenter):

```tsx
import {
  VStack,
  presentationCornerRadius,
  presentationDragIndicator,
  interactiveDismissDisabled,
} from '@appsent-co/react-native-watchos/renderer';

function SettingsScreen({ onDone }: { onDone: () => void }) {
  return (
    <VStack
      modifiers={[
        presentationCornerRadius(24),
        presentationDragIndicator('visible'),
        interactiveDismissDisabled(false),
      ]}
    >
      {/* … */}
    </VStack>
  );
}
```

Available presentation modifiers:

- `presentationDetents` — heights the sheet can rest at.
- `presentationCornerRadius` — corner radius of the sheet itself.
- `presentationBackground` — sheet background style.
- `presentationDragIndicator` — visibility of the grab handle.
- `interactiveDismissDisabled` — opt out of swipe-down dismiss.

## Full-screen cover

`fullScreenCover` is the same shape as `sheet`, but presents
non-dismissibly until the binding flips. On watchOS the runtime
falls back to a sheet that simply can't be dragged away.

```tsx
import { fullScreenCover } from '@appsent-co/react-native-watchos/renderer';
```

## See also

- [`NavigationStack`](./navigation-stack) — for hierarchical
  push/pop instead of modal presentation.
