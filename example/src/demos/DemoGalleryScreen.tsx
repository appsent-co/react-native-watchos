import {
  Label,
  List,
  NavigationLink,
  ScrollView,
  navigationTitle,
  padding,
} from '@appsent-co/react-native-watchos/renderer';

import { DEMOS, type DemoEntry } from './index';

/// Top-level screen for the "Demos" tab. Renders every entry in `DEMOS`
/// as a row; tapping pushes that demo as the destination.
export function DemoGalleryScreen() {
  return (
    <List modifiers={[navigationTitle('Demos')]}>
      {DEMOS.map((demo) => (
        <DemoRow key={demo.name} demo={demo} />
      ))}
    </List>
  );
}

function DemoRow({ demo }: { demo: DemoEntry }) {
  const { Component, name, icon } = demo;
  return (
    <NavigationLink>
      <NavigationLink.Label>
        <Label title={name} systemImage={icon} />
      </NavigationLink.Label>
      <NavigationLink.Destination>
        <ScrollView modifiers={[navigationTitle(name), padding(8)]}>
          <Component />
        </ScrollView>
      </NavigationLink.Destination>
    </NavigationLink>
  );
}
