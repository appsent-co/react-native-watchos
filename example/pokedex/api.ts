import type { Pokemon } from './types';

const POKEAPI = 'https://pokeapi.co/api/v2';

/// In-memory cache. The React tree mounts every `<PokemonDetailScreen>`
/// eagerly because `NavigationLink.Destination` lives in the shadow tree
/// even before the user navigates (see `RNWNavigationLinkView`). Caching
/// keeps repeat mounts (Fast Refresh, re-renders) from re-hitting PokeAPI.
const cache = new Map<number, Promise<Pokemon>>();

export function fetchPokemon(id: number): Promise<Pokemon> {
  let promise = cache.get(id);
  if (!promise) {
    promise = fetch(`${POKEAPI}/pokemon/${id}`)
      .then((r) => r.json())
      .then(normalize);
    cache.set(id, promise);
  }
  return promise;
}

/// Fetches the first `count` Pokémon in parallel. Used by the list screen
/// so we never have to do a per-row fetch as the user scrolls.
export function fetchFirst(count: number): Promise<Pokemon[]> {
  const ids = Array.from({ length: count }, (_, i) => i + 1);
  return Promise.all(ids.map(fetchPokemon));
}

function normalize(raw: RawPokemon): Pokemon {
  return {
    id: raw.id,
    name: raw.name,
    height: raw.height,
    weight: raw.weight,
    types: raw.types.map((t) => t.type.name),
    stats: raw.stats.map((s) => ({ name: s.stat.name, value: s.base_stat })),
    spriteUrl: spriteUrlFor(raw.id),
    artworkUrl: artworkUrlFor(raw.id),
  };
}

function spriteUrlFor(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

function artworkUrlFor(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

interface RawPokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: { type: { name: string } }[];
  stats: { base_stat: number; stat: { name: string } }[];
}
