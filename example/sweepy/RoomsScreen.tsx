import {
  List,
  NavigationLink,
  Text,
  VStack,
  font,
  frame,
  navigationTitle,
  padding,
} from '@appsent-co/react-native-watchos/renderer';

import { rooms } from './data';
import { ProgressIndicator } from './ProgressIndicator';
import { TasksScreen } from './TasksScreen';

/// Port of tmp/WatchApp/Views/RoomsView.swift. Each room row is a
/// NavigationLink that pushes a `TasksScreen` filtered to that room. The
/// enclosing `<NavigationStack>` is provided by the caller (App.tsx).
export function RoomsScreen() {
  return (
    <List modifiers={[navigationTitle('Rooms')]}>
      {rooms.map((room) => (
        <NavigationLink key={room.id}>
          <NavigationLink.Label>
            <VStack
              alignment="leading"
              spacing={2}
              modifiers={[frame({ height: 70 }), padding({ vertical: 4 })]}
            >
              <Text modifiers={[font('body')]}>{room.name}</Text>
              <ProgressIndicator value={room.displayedPercentClean} />
            </VStack>
          </NavigationLink.Label>
          <NavigationLink.Destination>
            <TasksScreen roomId={room.id} roomName={room.name} />
          </NavigationLink.Destination>
        </NavigationLink>
      ))}
    </List>
  );
}
