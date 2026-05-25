---
title: Lists & forms
sidebar_position: 5
---

# Lists & forms

## List

SwiftUI `List`. Children render as rows. On watchOS the default
style is `carousel` — rows scale as they scroll, which fights
explicit row heights; switch to `'plain'` if you need exact row
sizing.

```tsx
import {
  List,
  Text,
} from '@appsent-co/react-native-watchos/renderer';

<List>
  {items.map((item) => (
    <Text key={item.id}>{item.title}</Text>
  ))}
</List>;
```

| Prop | Type | Default |
| --- | --- | --- |
| `style` | `'plain' \| 'carousel' \| 'elliptical' \| 'automatic'` | `'automatic'` (SwiftUI picks, typically `carousel` on watchOS) |

### List with NavigationLink rows

The canonical drill-down pattern:

```tsx
import {
  NavigationStack,
  List,
  NavigationLink,
  Label,
  Text,
} from '@appsent-co/react-native-watchos/renderer';

<NavigationStack>
  <List>
    {rooms.map((room) => (
      <NavigationLink key={room.id}>
        <NavigationLink.Label>
          <Label title={room.name} systemImage="house.fill" />
        </NavigationLink.Label>
        <NavigationLink.Destination>
          <RoomScreen room={room} />
        </NavigationLink.Destination>
      </NavigationLink>
    ))}
  </List>
</NavigationStack>;
```

See [`NavigationLink`](../navigation/navigation-link) for the slot
shape.

## Section

Group rows inside a `List` (or `Form`). Optional `Section.Header`
and `Section.Footer` slots route into SwiftUI's `header:` / `footer:`
parameters.

```tsx
import {
  List,
  Section,
  Text,
} from '@appsent-co/react-native-watchos/renderer';

<List>
  <Section>
    <Section.Header>
      <Text>Today</Text>
    </Section.Header>
    {today.map((task) => (
      <Text key={task.id}>{task.title}</Text>
    ))}
  </Section>

  <Section>
    <Section.Header>
      <Text>Tomorrow</Text>
    </Section.Header>
    {tomorrow.map((task) => (
      <Text key={task.id}>{task.title}</Text>
    ))}
  </Section>
</List>;
```

A `Section` outside a `List` falls back to rendering children inline
— graceful degradation, not an intended use.

## Form

SwiftUI `Form`. Container for settings / data-entry screens. Children
render as grouped, scrolling rows — typically wrap them in `<Section>`
with controls inside.

```tsx
import {
  Form,
  Section,
  Toggle,
  Stepper,
  Picker,
  Text,
} from '@appsent-co/react-native-watchos/renderer';

<Form>
  <Section>
    <Section.Header>
      <Text>Notifications</Text>
    </Section.Header>
    <Toggle value={notifications} onChange={setNotifications}>
      <Text>Enabled</Text>
    </Toggle>
    <Stepper
      label="Frequency (min)"
      value={frequency}
      minimum={1}
      maximum={60}
      onChange={setFrequency}
    />
  </Section>

  <Section>
    <Section.Header>
      <Text>Appearance</Text>
    </Section.Header>
    <Picker
      label="Theme"
      selection={theme}
      onSelectionChange={setTheme}
      options={[
        { value: 'auto', label: 'Auto' },
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
      ]}
    />
  </Section>
</Form>;
```

No props.

## Customizing rows

Use list modifiers from [Modifiers](./modifiers#modifier-families):

- `listRowBackground(color)` — per-row background.
- `listRowInsets({ … })` — per-row insets.
- `listStyle('plain')` — apply at the `List` level.
- `listSectionSpacing(value)` — gap between sections.

```tsx
import {
  List,
  Text,
  listRowBackground,
} from '@appsent-co/react-native-watchos/renderer';

<List>
  {items.map((item) => (
    <Text
      key={item.id}
      modifiers={[listRowBackground(item.done ? 'green' : 'gray')]}
    >
      {item.title}
    </Text>
  ))}
</List>;
```

## See also

- [Controls](./controls) — building blocks for a `Form`.
- [Layout](./layout) — `LazyVStack` / `LazyVGrid` for non-list
  scrollable content.
