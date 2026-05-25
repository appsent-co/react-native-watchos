import { useState } from 'react';
import {
  Form,
  Section,
  Slider,
  Text,
  Toggle,
} from '@appsent-co/react-native-watchos/renderer';

/// Demo of `<Form>` — verifies it renders as a grouped, scrolling
/// settings-style container around `<Section>` rows on watchOS.
export function FormDemo() {
  const [notify, setNotify] = useState(true);
  const [volume, setVolume] = useState(0.5);

  return (
    <Form>
      <Section>
        <Section.Header>
          <Text>Preferences</Text>
        </Section.Header>
        <Toggle value={notify} onChange={setNotify}>
          <Text>Notifications</Text>
        </Toggle>
        <Slider value={volume} onChange={setVolume} min={0} max={1} />
      </Section>
      <Section>
        <Text>Settings sync across devices.</Text>
      </Section>
    </Form>
  );
}
