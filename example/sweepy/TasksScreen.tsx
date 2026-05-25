import { useRef, useState } from 'react';
import {
  Button,
  HStack,
  Image,
  List,
  Spacer,
  Text,
  VStack,
  font,
  foregroundColor,
  frame,
  navigationTitle,
  padding,
} from '@appsent-co/react-native-watchos/renderer';

import { tasks as allTasks, type RoomTask } from './data';
import { EffortIndicator } from './EffortIndicator';
import { ProgressIndicator } from './ProgressIndicator';

interface TasksScreenProps {
  roomId: string;
  roomName: string;
}

/// Port of tmp/WatchApp/Views/TasksView.swift. Each row toggles open on
/// tap to reveal Back / Done buttons. Pressing Done animates the
/// progress bar to 100%; the row stays in the list.
export function TasksScreen({ roomId, roomName }: TasksScreenProps) {
  const tasks = allTasks.filter((t) => t.roomId === roomId);

  if (tasks.length === 0) {
    return (
      <Text modifiers={[padding(16), navigationTitle(roomName)]}>
        No tasks for {roomName}!
      </Text>
    );
  }

  return (
    <List modifiers={[navigationTitle(roomName)]}>
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </List>
  );
}

function TaskRow({ task }: { task: RoomTask }) {
  const [toggled, setToggled] = useState(false);
  const [displayedPct, setDisplayedPct] = useState(task.displayedPercentClean);
  const animatingRef = useRef(false);
  const lastEvent = task.lastEventDate
    ? new Date(task.lastEventDate)
    : undefined;
  const initiallyDone =
    !!lastEvent && lastEvent.toDateString() === new Date().toDateString();
  const [markedDone, setMarkedDone] = useState(initiallyDone);

  const handleDone = () => {
    setToggled(false);
    if (displayedPct === undefined) {
      setMarkedDone(true);
      return;
    }
    if (animatingRef.current) return;
    animatingRef.current = true;
    // JS-driven easeOutCubic ramp — each tick fires setState which
    // re-renders ProgressView at the new value. Driving from JS sidesteps
    // SwiftUI's implicit-animation tracking (unreliable through AnyView
    // erasure + the toggle's mount/unmount). First tick is deferred a
    // frame so the un-toggled commit lands at the current value before
    // we begin ramping.
    const from = displayedPct;
    const start = Date.now();
    const duration = 400;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayedPct(from + (1 - from) * eased);
      if (t < 1) {
        setTimeout(tick, 16);
      } else {
        animatingRef.current = false;
      }
    };
    setTimeout(tick, 16);
  };

  if (!toggled) {
    return (
      <Button
        onPress={() => setToggled(true)}
        modifiers={[frame({ height: 70 })]}
      >
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font('caption')]}>{task.name}</Text>
          <HStack spacing={6}>
            {displayedPct !== undefined ? (
              <ProgressIndicator value={displayedPct} />
            ) : (
              <>
                <Spacer />
                {markedDone && (
                  <Image
                    systemName="checkmark"
                    modifiers={[foregroundColor('green')]}
                  />
                )}
              </>
            )}
            <EffortIndicator effort={task.effort} />
          </HStack>
        </VStack>
      </Button>
    );
  }

  return (
    <HStack spacing={4} modifiers={[frame({ height: 70 })]}>
      <Button onPress={() => setToggled(false)}>
        <VStack>
          <Image systemName="arrow.left" />
          <Text modifiers={[font('caption')]}>Back</Text>
        </VStack>
      </Button>
      <Button onPress={handleDone}>
        <VStack>
          <Image systemName="checkmark" />
          <Text modifiers={[font('caption')]}>Done</Text>
        </VStack>
      </Button>
    </HStack>
  );
}
