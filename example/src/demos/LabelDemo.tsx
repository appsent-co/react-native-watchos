import { Label, VStack } from '@appsent-co/react-native-watchos/renderer';

export function LabelDemo() {
  return (
    <VStack>
      <Label title="Settings" systemImage="gearshape.fill" />
      <Label title="Heart Rate" systemImage="heart.fill" />
      <Label title="Star" systemImage="star.fill" />
    </VStack>
  );
}
