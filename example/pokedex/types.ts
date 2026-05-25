/// The subset of PokeAPI's `/pokemon/{id}` response we actually use.
/// Kept narrow on purpose — the full payload is sprawling and most of it
/// (game indices, moves, abilities, encounters) isn't surfaced in the
/// watch UI.
export interface Pokemon {
  id: number;
  name: string;
  /// In decimetres per the PokeAPI contract — divide by 10 for metres.
  height: number;
  /// In hectograms per the PokeAPI contract — divide by 10 for kilograms.
  weight: number;
  types: string[];
  stats: PokemonStat[];
  spriteUrl: string;
  artworkUrl: string;
}

export interface PokemonStat {
  /// Canonical PokeAPI stat key (`'hp'`, `'attack'`, `'special-attack'`, …).
  name: string;
  /// Base value in [0, 255]. 255 is the SwiftUI Gauge upper bound we use.
  value: number;
}
