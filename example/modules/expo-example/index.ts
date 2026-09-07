import { requireNativeModule } from 'expo-modules-core';

export default requireNativeModule<{
  hello(): string;
  echo(message: string): Promise<string>;
}>('ExampleExpoModule');
