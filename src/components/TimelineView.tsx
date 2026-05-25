import { createNativeView } from '../createNativeView';

export type TimelineSchedule =
  | { kind: 'everyMinute' }
  | { kind: 'periodic'; from?: number; by: number }
  | { kind: 'animation'; minimumInterval?: number; paused?: boolean }
  | { kind: 'explicit'; dates: number[] };

export interface TimelineViewProps {
  schedule: TimelineSchedule;
}

export const TimelineView = createNativeView<TimelineViewProps>('TimelineView');
