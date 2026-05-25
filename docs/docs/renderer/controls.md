---
title: Controls
sidebar_position: 4
---

# Controls

All input controls are **controlled** — JS owns the source of truth,
the native side mirrors the value locally for instant tactile
feedback and converges on the JS value.

## Button

SwiftUI `Button`. Children become the label content — typically a
`<Text>`, but any view works.

```tsx
import {
  Button,
  Text,
} from '@appsent-co/react-native-watchos/renderer';

<Button onPress={() => save()}>
  <Text>Save</Text>
</Button>

<Button onPress={() => share()}>
  <Label title="Share" systemImage="square.and.arrow.up" />
</Button>
```

| Prop | Type |
| --- | --- |
| `onPress` | `() => void` |

Style with [`buttonStyle`](./modifiers#modifier-families) — `'bordered'`,
`'borderedProminent'`, `'plain'`, etc.

## Toggle

SwiftUI `Toggle`. Children become the toggle's label.

```tsx
import {
  Toggle,
  Text,
} from '@appsent-co/react-native-watchos/renderer';

const [enabled, setEnabled] = useState(false);

<Toggle value={enabled} onChange={setEnabled}>
  <Text>Notifications</Text>
</Toggle>;
```

| Prop | Type | Notes |
| --- | --- | --- |
| `value` | `boolean` | Current on/off state. |
| `onChange` | `(value: boolean) => void` | Fires when the user flips the toggle. |

## Slider

SwiftUI `Slider`. No label children — labels aren't common on
watchOS sliders. Wrap with [`HStack`](./layout#hstack) + `<Text>`
for a caption.

```tsx
import {
  Slider,
} from '@appsent-co/react-native-watchos/renderer';

const [volume, setVolume] = useState(0.5);

<Slider value={volume} min={0} max={1} step={0.05} onChange={setVolume} />;
```

| Prop | Type | Default |
| --- | --- | --- |
| `value` | `number` | required |
| `min` | `number` | `0` |
| `max` | `number` | `1` |
| `step` | `number` | continuous when omitted |
| `onChange` | `(value: number) => void` | — |

## Stepper

SwiftUI `Stepper`. No children — the label is provided as a prop
(matches SwiftUI's `Stepper(_:value:in:step:)` overload).

```tsx
import { Stepper } from '@appsent-co/react-native-watchos/renderer';

const [reps, setReps] = useState(10);

<Stepper label="Reps" value={reps} minimum={0} maximum={50} step={1} onChange={setReps} />;
```

| Prop | Type | Notes |
| --- | --- | --- |
| `label` | `string` | required |
| `value` | `number` | required |
| `minimum` | `number` | When both `minimum` and `maximum` are present, value is clamped. |
| `maximum` | `number` | — |
| `step` | `number` | Defaults to `1`. |
| `onChange` | `(value: number) => void` | — |

## Picker

SwiftUI `Picker`. Options are a prop array (not children) — each
becomes a tagged row in the native picker.

```tsx
import { Picker } from '@appsent-co/react-native-watchos/renderer';

const [size, setSize] = useState('m');

<Picker
  label="Size"
  selection={size}
  onSelectionChange={setSize}
  options={[
    { value: 's', label: 'Small' },
    { value: 'm', label: 'Medium' },
    { value: 'l', label: 'Large' },
  ]}
/>;
```

| Prop | Type | Notes |
| --- | --- | --- |
| `label` | `string` | Shown next to the selection on watchOS. |
| `selection` | `string` | Currently selected option's `value`. |
| `options` | `{ value: string; label: string }[]` | Choices. |
| `onSelectionChange` | `(value: string) => void` | — |

Style with [`pickerStyle`](./modifiers#modifier-families) — `'wheel'`,
`'navigationLink'`, etc.

## DatePicker

SwiftUI `DatePicker`. Pick a date and/or time.

```tsx
import { DatePicker } from '@appsent-co/react-native-watchos/renderer';

const [when, setWhen] = useState(new Date());

<DatePicker value={when} onChange={setWhen} />;
```

See [`src/components/DatePicker.tsx`](https://github.com/appsent-co/react-native-watchos/blob/main/src/components/DatePicker.tsx)
for the full prop set.

## TextField

SwiftUI `TextField`. No label children — wrap with `HStack` + `Text`
for a caption.

```tsx
import { TextField } from '@appsent-co/react-native-watchos/renderer';

const [name, setName] = useState('');

<TextField placeholder="Name" value={name} onChange={setName} />;
```

| Prop | Type |
| --- | --- |
| `placeholder` | `string` |
| `value` | `string` |
| `onChange` | `(value: string) => void` |

## SecureField

Same shape as [`TextField`](#textfield), but the value is masked.

```tsx
import { SecureField } from '@appsent-co/react-native-watchos/renderer';

<SecureField placeholder="Passcode" value={passcode} onChange={setPasscode} />;
```

## See also

- [Modifiers](./modifiers) — `buttonStyle`, `toggleStyle`,
  `pickerStyle`, `disabled`, accessibility helpers.
- [Lists](./lists) — composing controls into a settings screen.
