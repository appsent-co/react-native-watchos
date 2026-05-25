import { useState } from 'react';
import { Stepper, Text, VStack } from '@appsent-co/react-native-watchos/renderer';

export function StepperDemo() {
  const [value, setValue] = useState(5);

  return (
    <VStack>
      <Stepper
        label="Quantity"
        value={value}
        minimum={0}
        maximum={10}
        step={1}
        onChange={setValue}
      />
      <Text>Value: {String(value)}</Text>
    </VStack>
  );
}
