import { useEffect, useState } from 'react';
import { Text, VStack } from '@appsent-co/react-native-watchos/renderer';
import ExampleExpoModule from '../../modules/expo-example';

export function ExpoModulesDemo() {
  const [message, setMessage] = useState('Loading…');

  useEffect(() => {
    ExampleExpoModule.echo(ExampleExpoModule.hello())
      .then(setMessage)
      .catch((error: Error) => setMessage(error.message));
  }, []);

  return (
    <VStack spacing={8}>
      <Text>Expo Modules</Text>
      <Text>{message}</Text>
    </VStack>
  );
}
