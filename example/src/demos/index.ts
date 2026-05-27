import type { ComponentType } from 'react';

import { AsyncImageDemo } from './AsyncImageDemo';
import { DatePickerDemo } from './DatePickerDemo';
import { FormDemo } from './FormDemo';
import { GaugeDemo } from './GaugeDemo';
import { GroupDemo } from './GroupDemo';
import { LabelDemo } from './LabelDemo';
import { LocalImageDemo } from './LocalImageDemo';
import { PickerDemo } from './PickerDemo';
import { ShapesDemo } from './ShapesDemo';
import { SheetDemo } from './SheetDemo';
import { SQLiteDemo } from './SQLiteDemo';
import { StepperDemo } from './StepperDemo';
import { TextInputDemo } from './TextInputDemo';

export interface DemoEntry {
  /// Display name in the gallery list and the destination's navigation title.
  name: string;
  /// SF Symbol shown to the left of the row label.
  icon: string;
  Component: ComponentType;
}

/// Single source of truth for the demo gallery. Add new demos here — they
/// surface in the gallery list automatically.
export const DEMOS: readonly DemoEntry[] = [
  { name: 'AsyncImage', icon: 'photo', Component: AsyncImageDemo },
  { name: 'DatePicker', icon: 'calendar', Component: DatePickerDemo },
  { name: 'Form', icon: 'list.bullet.rectangle', Component: FormDemo },
  { name: 'Gauge', icon: 'gauge', Component: GaugeDemo },
  { name: 'Group', icon: 'square.on.square', Component: GroupDemo },
  { name: 'Label', icon: 'tag', Component: LabelDemo },
  { name: 'LocalImage', icon: 'photo.fill', Component: LocalImageDemo },
  { name: 'Picker', icon: 'list.bullet', Component: PickerDemo },
  { name: 'Shapes', icon: 'square.on.circle', Component: ShapesDemo },
  {
    name: 'Sheet',
    icon: 'rectangle.bottomthird.inset.filled',
    Component: SheetDemo,
  },
  { name: 'SQLite', icon: 'cylinder.split.1x2', Component: SQLiteDemo },
  { name: 'Stepper', icon: 'plusminus.circle', Component: StepperDemo },
  {
    name: 'TextInput',
    icon: 'character.cursor.ibeam',
    Component: TextInputDemo,
  },
];
