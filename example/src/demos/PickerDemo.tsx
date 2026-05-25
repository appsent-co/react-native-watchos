import { useState } from 'react';
import { Picker, Text, VStack } from '@appsent-co/react-native-watchos/renderer';

const OPTIONS = [
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
];

export function PickerDemo() {
  const [color, setColor] = useState('red');
  return (
    <VStack>
      <Picker
        label="Color"
        selection={color}
        options={OPTIONS}
        onSelectionChange={setColor}
      />
      <Text>Selected: {color}</Text>
    </VStack>
  );
}
