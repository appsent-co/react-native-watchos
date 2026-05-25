/// Canonical Pokémon type → hex colour. Used as the background fill for
/// type badges on the detail screen. Source: roughly matches Bulbapedia's
/// type colour palette.
export const TYPE_COLORS: Record<string, string> = {
  normal: '#a8a878',
  fire: '#f08030',
  water: '#6890f0',
  electric: '#f8d030',
  grass: '#78c850',
  ice: '#98d8d8',
  fighting: '#c03028',
  poison: '#a040a0',
  ground: '#e0c068',
  flying: '#a890f0',
  psychic: '#f85888',
  bug: '#a8b820',
  rock: '#b8a038',
  ghost: '#705898',
  dragon: '#7038f8',
  dark: '#705848',
  steel: '#b8b8d0',
  fairy: '#ee99ac',
};

export function colorForType(name: string): string {
  return TYPE_COLORS[name] ?? '#888888';
}

/// Title-cases a kebab-case or single-word string. PokeAPI returns names
/// like `'special-attack'`; we render them as `'Special Attack'`.
export function titleCase(s: string): string {
  return s
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/// Short labels for the six base stats. Stat names are long enough that the
/// long form overflows the watch screen; abbreviate.
export const STAT_ABBREVIATIONS: Record<string, string> = {
  'hp': 'HP',
  'attack': 'ATK',
  'defense': 'DEF',
  'special-attack': 'SpA',
  'special-defense': 'SpD',
  'speed': 'SPD',
};

export function statLabel(name: string): string {
  return STAT_ABBREVIATIONS[name] ?? titleCase(name);
}
