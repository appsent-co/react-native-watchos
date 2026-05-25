import { useState } from 'react';
import { DatePicker, Text, VStack } from '@appsent-co/react-native-watchos/renderer';

export function DatePickerDemo() {
  const [date, setDate] = useState<string>(new Date().toISOString());
  return (
    <VStack>
      <DatePicker
        label="Pick a date"
        selection={date}
        onSelectionChange={setDate}
        displayedComponents="date"
      />
      <Text>{date}</Text>
    </VStack>
  );
}
