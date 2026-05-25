import { useState } from 'react';
import {
  SecureField,
  Text,
  TextField,
  VStack,
} from '@appsent-co/react-native-watchos/renderer';

/// Smoke test for the `TextField` + `SecureField` two-way bindings.
/// The `<Text>` below should update as the user types in either field,
/// proving the native → JS `onChange` round-trip works for both.
export function TextInputDemo() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  return (
    <VStack>
      <TextField placeholder="Name" value={name} onChange={setName} />
      <SecureField
        placeholder="Password"
        value={password}
        onChange={setPassword}
      />
      <Text>{`${name} / ${password}`}</Text>
    </VStack>
  );
}
