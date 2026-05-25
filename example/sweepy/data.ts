// Hardcoded mock data for the sweepy UI rewrite. Mirrors the shapes from
// the original Swift models in tmp/Shared/Models — just enough fields for
// the UI to render. No networking, no auth, no persistence.

export interface Room {
  id: string;
  name: string;
  /// 0…1 — how clean the room is right now (higher = cleaner).
  displayedPercentClean: number;
}

export interface RoomTask {
  id: string;
  name: string;
  roomId: string;
  /// 0…1, or undefined for an on-demand task without a target percentage.
  displayedPercentClean?: number;
  /// 0…3 dots.
  effort: number;
  /// ISO date of last completion. If today → render the green checkmark.
  lastEventDate?: string;
}

export interface ScheduleTask {
  id: string;
  name: string;
  roomId: string;
  effort: number;
}

export const rooms: Room[] = [
  { id: 'kitchen', name: 'Kitchen', displayedPercentClean: 0.82 },
  { id: 'bath', name: 'Bathroom', displayedPercentClean: 0.34 },
  { id: 'living', name: 'Living Room', displayedPercentClean: 0.61 },
  { id: 'bed', name: 'Bedroom', displayedPercentClean: 0.12 },
  { id: 'office', name: 'Office', displayedPercentClean: 0.97 },
];

const todayIso = new Date().toISOString();
const yesterdayIso = new Date(Date.now() - 86_400_000).toISOString();

export const tasks: RoomTask[] = [
  {
    id: 't1',
    roomId: 'kitchen',
    name: 'Wipe counters',
    displayedPercentClean: 0.9,
    effort: 1,
    lastEventDate: todayIso,
  },
  {
    id: 't2',
    roomId: 'kitchen',
    name: 'Mop floor',
    displayedPercentClean: 0.4,
    effort: 2,
    lastEventDate: yesterdayIso,
  },
  {
    id: 't3',
    roomId: 'kitchen',
    name: 'Empty trash',
    effort: 1,
    lastEventDate: yesterdayIso,
  },
  {
    id: 't4',
    roomId: 'bath',
    name: 'Scrub shower',
    displayedPercentClean: 0.2,
    effort: 3,
  },
  {
    id: 't5',
    roomId: 'bath',
    name: 'Clean toilet',
    displayedPercentClean: 0.5,
    effort: 2,
  },
  {
    id: 't6',
    roomId: 'living',
    name: 'Vacuum rug',
    displayedPercentClean: 0.7,
    effort: 2,
    lastEventDate: yesterdayIso,
  },
  {
    id: 't7',
    roomId: 'living',
    name: 'Dust shelves',
    displayedPercentClean: 0.55,
    effort: 1,
  },
  {
    id: 't8',
    roomId: 'bed',
    name: 'Change sheets',
    displayedPercentClean: 0.05,
    effort: 2,
  },
  {
    id: 't9',
    roomId: 'bed',
    name: 'Make bed',
    effort: 1,
    lastEventDate: todayIso,
  },
  {
    id: 't10',
    roomId: 'office',
    name: 'Tidy desk',
    displayedPercentClean: 0.95,
    effort: 1,
    lastEventDate: todayIso,
  },
];

export const schedule: ScheduleTask[] = [
  { id: 's1', roomId: 'kitchen', name: 'Wipe counters', effort: 1 },
  { id: 's2', roomId: 'kitchen', name: 'Mop floor', effort: 2 },
  { id: 's3', roomId: 'bath', name: 'Scrub shower', effort: 3 },
  { id: 's4', roomId: 'living', name: 'Dust shelves', effort: 1 },
  { id: 's5', roomId: 'bed', name: 'Change sheets', effort: 2 },
];
