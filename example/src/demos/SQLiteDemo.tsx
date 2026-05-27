import { useEffect, useState } from 'react';
import { open } from '@op-engineering/op-sqlite';
import {
  Text,
  VStack,
  font,
  foregroundStyle,
} from '@appsent-co/react-native-watchos/renderer';

interface Row {
  id: number;
  name: string;
  age: number;
}

export function SQLiteDemo() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // op-sqlite reads `:memory:` from `location`, not `name`.
      const db = open({ name: 'demo.db', location: ':memory:' });
      db.executeSync(
        'CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)'
      );
      db.executeSync('INSERT INTO items (name, age) VALUES (?, ?)', [
        'Alice',
        30,
      ]);
      db.executeSync('INSERT INTO items (name, age) VALUES (?, ?)', [
        'Bob',
        25,
      ]);
      db.executeSync('INSERT INTO items (name, age) VALUES (?, ?)', [
        'Carol',
        42,
      ]);
      const result = db.executeSync('SELECT * FROM items ORDER BY age');
      setRows((result.rows ?? []) as unknown as Row[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  if (error != null) {
    return (
      <VStack spacing={4}>
        <Text modifiers={[font({ style: 'headline' })]}>op-sqlite</Text>
        <Text modifiers={[foregroundStyle('red')]}>{error}</Text>
      </VStack>
    );
  }

  if (rows == null) {
    return (
      <VStack>
        <Text>Loading…</Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={4}>
      <Text modifiers={[font({ style: 'headline' })]}>op-sqlite</Text>
      <Text modifiers={[foregroundStyle('secondary'), font({ style: 'caption' })]}>
        SELECT * FROM items ORDER BY age
      </Text>
      {rows.map((row) => (
        <Text key={row.id}>
          {row.name} — {row.age}
        </Text>
      ))}
    </VStack>
  );
}
