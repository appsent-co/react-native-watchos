import {
  AsyncImage,
  Gauge,
  HStack,
  RoundedRectangle,
  ScrollView,
  Section,
  Spacer,
  Text,
  VStack,
  ZStack,
  background,
  font,
  foregroundColor,
  frame,
  navigationTitle,
  padding,
  resizable,
  scaledToFit,
} from '@appsent-co/react-native-watchos/renderer';

import type { Pokemon } from './types';
import { colorForType, statLabel, titleCase } from './typeColors';

interface Props {
  pokemon: Pokemon;
}

/// Max base stat in the games is 255 (Blissey HP). Using a fixed upper
/// bound keeps the Gauges visually comparable across Pokémon.
const STAT_MAX = 255;

export function PokemonDetailScreen({ pokemon }: Props) {
  return (
    <ScrollView modifiers={[navigationTitle(titleCase(pokemon.name))]}>
      <VStack>
        <AsyncImage
          url={pokemon.artworkUrl}
          modifiers={[frame({ width: 140, height: 140 })]}
        >
          <AsyncImage.Success>
            <AsyncImage.Image modifiers={[resizable(), scaledToFit()]} />
          </AsyncImage.Success>
        </AsyncImage>

        <Text
          modifiers={[font({ style: 'caption' }), foregroundColor('secondary')]}
        >
          {formatId(pokemon.id)}
        </Text>

        <Section>
          <Section.Header>
            <Text>Types</Text>
          </Section.Header>
          <HStack>
            {pokemon.types.map((t) => (
              <TypeBadge key={t} type={t} />
            ))}
            <Spacer />
          </HStack>
        </Section>

        <Section>
          <Section.Header>
            <Text>Base Stats</Text>
          </Section.Header>
          {pokemon.stats.map((s) => (
            <Gauge
              key={s.name}
              value={s.value}
              minimum={0}
              maximum={STAT_MAX}
              label={statLabel(s.name)}
              currentValueLabel={String(s.value)}
            />
          ))}
        </Section>

        <Section>
          <Section.Header>
            <Text>Physical</Text>
          </Section.Header>
          <HStack>
            <Text>Height</Text>
            <Spacer />
            <Text>{(pokemon.height / 10).toFixed(1)} m</Text>
          </HStack>
          <HStack>
            <Text>Weight</Text>
            <Spacer />
            <Text>{(pokemon.weight / 10).toFixed(1)} kg</Text>
          </HStack>
        </Section>
      </VStack>
    </ScrollView>
  );
}

/// Coloured pill: a rounded rectangle filled with the type's signature
/// colour, with the type name laid over it. ZStack composes the two layers.
function TypeBadge({ type }: { type: string }) {
  return (
    <ZStack>
      <RoundedRectangle
        cornerRadius={8}
        modifiers={[
          frame({ width: 64, height: 22 }),
          foregroundColor(colorForType(type)),
        ]}
      />
      <Text
        modifiers={[
          font({ style: 'caption' }),
          foregroundColor('white'),
          padding({ horizontal: 6 }),
        ]}
      >
        {titleCase(type)}
      </Text>
    </ZStack>
  );
}

function formatId(id: number): string {
  return `#${String(id).padStart(3, '0')}`;
}
