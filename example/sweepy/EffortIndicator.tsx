import { HStack, Image, foregroundColor } from '@appsent-co/react-native-watchos/renderer';

interface EffortIndicatorProps {
  /// Number of filled dots (0…3). Remaining dots up to 3 render as
  /// outlines.
  effort: number;
}

/// Three dot row showing task effort. Port of
/// tmp/WatchApp/Views/EffortIndicatorView.swift — Circle shapes there,
/// SF Symbols here (circle.fill / circle) since the library doesn't
/// expose shape primitives yet.
export function EffortIndicator({ effort }: EffortIndicatorProps) {
  return (
    <HStack spacing={2}>
      {Array.from({ length: 3 }, (_, i) => (
        <Image
          key={i}
          systemName={i < effort ? 'circle.fill' : 'circle'}
          modifiers={[foregroundColor('white')]}
        />
      ))}
    </HStack>
  );
}
