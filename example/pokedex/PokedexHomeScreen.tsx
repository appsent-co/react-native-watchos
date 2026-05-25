import { useEffect, useState } from 'react';
import {
  AsyncImage,
  HStack,
  List,
  NavigationLink,
  ProgressView,
  Text,
  VStack,
  font,
  foregroundColor,
  frame,
  navigationTitle,
  padding,
  resizable,
  scaledToFit,
} from '@appsent-co/react-native-watchos/renderer';

import { fetchFirst } from './api';
import type { Pokemon } from './types';
import { titleCase } from './typeColors';
import { PokemonDetailScreen } from './PokemonDetailScreen';

/// How many Pokémon the list shows. Kept low because each row's
/// `NavigationLink.Destination` is in the React shadow tree from the
/// start (lazy SwiftUI, eager JS) — bumping this multiplies startup work.
const VISIBLE_COUNT = 30;

export function PokedexHomeScreen() {
  const [data, setData] = useState<Pokemon[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchFirst(VISIBLE_COUNT)
      .then((rows) => {
        if (!cancelled) setData(rows);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message ?? e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <VStack modifiers={[padding(8), navigationTitle('Pokédex')]}>
        <Text modifiers={[foregroundColor('red')]}>Failed to load</Text>
        <Text modifiers={[font({ style: 'caption' })]}>{error}</Text>
      </VStack>
    );
  }

  if (!data) {
    return (
      <VStack modifiers={[padding(16), navigationTitle('Pokédex')]}>
        <ProgressView />
        <Text modifiers={[font({ style: 'caption' })]}>Loading Pokédex…</Text>
      </VStack>
    );
  }

  return (
    <List modifiers={[navigationTitle('Pokédex')]}>
      {data.map((p) => (
        <NavigationLink key={p.id}>
          <NavigationLink.Label>
            <HStack>
              <AsyncImage
                url={p.spriteUrl}
                modifiers={[frame({ width: 40, height: 40 })]}
              >
                <AsyncImage.Success>
                  <AsyncImage.Image
                    modifiers={[resizable(), scaledToFit()]}
                  />
                </AsyncImage.Success>
              </AsyncImage>
              <VStack>
                <Text modifiers={[font({ style: 'headline' })]}>
                  {titleCase(p.name)}
                </Text>
                <Text
                  modifiers={[
                    font({ style: 'caption' }),
                    foregroundColor('secondary'),
                  ]}
                >
                  {formatId(p.id)} · {p.types.map(titleCase).join(' / ')}
                </Text>
              </VStack>
            </HStack>
          </NavigationLink.Label>
          <NavigationLink.Destination>
            <PokemonDetailScreen pokemon={p} />
          </NavigationLink.Destination>
        </NavigationLink>
      ))}
    </List>
  );
}

function formatId(id: number): string {
  return `#${String(id).padStart(3, '0')}`;
}
