import { useState } from 'react';
import { NavigationStack, TabView } from '@appsent-co/react-native-watchos/renderer';

import { PokedexHomeScreen } from './pokedex/PokedexHomeScreen';
import { DemoGalleryScreen } from './src/demos/DemoGalleryScreen';

/// Two-tab demo app for the watchOS bridge.
///
/// Tab 1: a tiny Pokédex client (live PokeAPI fetch) that exercises
/// AsyncImage, Gauge, RoundedRectangle, ZStack, List/Section,
/// ScrollView, NavigationStack/Link, and the basic layout primitives.
///
/// Tab 2: a gallery that lets you pick any individual SwiftUI view
/// demo we ship (Group, Label, Shapes, Picker, TextField/SecureField,
/// Form, AsyncImage, DatePicker, Stepper, Gauge).
export default function App() {
  const [tab, setTab] = useState('pokedex');

  return (
    <TabView selection={tab} onSelectionChange={setTab} style="page">
      <NavigationStack tabTag="pokedex">
        <PokedexHomeScreen />
      </NavigationStack>
      <NavigationStack tabTag="demos">
        <DemoGalleryScreen />
      </NavigationStack>
    </TabView>
  );
}
