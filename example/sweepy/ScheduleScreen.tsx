import { useRef, useState } from 'react';
import {
  Button,
  HStack,
  Image,
  List,
  Section,
  Text,
  VStack,
  font,
  frame,
  navigationTitle,
} from '@appsent-co/react-native-watchos/renderer';

import { rooms, schedule as initialSchedule, type ScheduleTask } from './data';
import { EffortIndicator } from './EffortIndicator';
import { ProgressIndicator } from './ProgressIndicator';

/// Port of tmp/WatchApp/Views/ScheduleView.swift. One Section per room
/// (header = room name); each section lists today's planned tasks for it.
/// Tapping a task toggles to Back / Done; Done animates the progress bar
/// to 100% in place — the row stays in the list.
export function ScheduleScreen() {
  return (
    <List modifiers={[navigationTitle('Schedules')]}>
      {rooms
        .map((room) => ({
          room,
          tasks: initialSchedule.filter((t) => t.roomId === room.id),
        }))
        .filter(({ tasks: roomTasks }) => roomTasks.length > 0)
        .map(({ room, tasks: roomTasks }) => (
          <Section key={room.id}>
            <Section.Header>
              <Text modifiers={[font('caption')]}>{room.name}</Text>
            </Section.Header>
            {roomTasks.map((task) => (
              <ScheduleRow key={task.id} task={task} />
            ))}
          </Section>
        ))}
    </List>
  );
}

function ScheduleRow({ task }: { task: ScheduleTask }) {
  const [toggled, setToggled] = useState(false);
  const [displayedPct, setDisplayedPct] = useState(0);
  const animatingRef = useRef(false);

  const handleDone = () => {
    setToggled(false);
    if (animatingRef.current) return;
    animatingRef.current = true;
    // JS-driven easeOutCubic ramp — see TaskRow.handleDone for the full
    // explanation. Ramps from `displayedPct` up to 1 over 400ms.
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
            <ProgressIndicator value={displayedPct} />
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
