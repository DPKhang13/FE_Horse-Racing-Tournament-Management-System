export type Role = "admin" | "owner" | "jockey" | "referee" | "spectator";

export type Status =
  | "active"
  | "inactive"
  | "pending"
  | "approved"
  | "rejected"
  | "confirmed"
  | "scheduled"
  | "ongoing"
  | "completed"
  | "cancelled"
  | "open"
  | "closed"
  | "draft"
  | "published"
  | "won"
  | "lost"
  | "settled"
  | "success"
  | "failed"
  | "unread"
  | "read"
  | "accepted";

export interface Tournament {
  id: string;
  code: string;
  name: string;
  venue: string;
  city: string;
  startDate: string;
  endDate: string;
  status: Status;
  prizePool: number;
  races: number;
  participants: number;
  capacity: number;
  cover: string;
  tier: "Premier" | "Classic" | "Open";
}

export interface ScheduleDay {
  id: string;
  tournamentId: string;
  date: string;
  label: string;
  gates: string;
  races: number;
  status: Status;
}

export interface Race {
  id: string;
  tournamentId: string;
  tournament: string;
  scheduleId: string;
  name: string;
  number: number;
  rankGroup: string;
  scheduledAt: string;
  predictionClose: string;
  distance: number;
  laps: number;
  maxHorses: number;
  enteredHorses: number;
  maxReferees: number;
  assignedReferees: number;
  trackType: "Turf" | "Dirt" | "Synthetic";
  status: Status;
  prize: number;
}

export interface Horse {
  id: string;
  name: string;
  breed: string;
  age: number;
  weight: number;
  owner: string;
  ownerStable: string;
  rankGroup: string;
  points: number;
  wins: number;
  starts: number;
  status: Status;
  avatar: string;
  color: "bay" | "chestnut" | "black" | "grey";
}

export interface Jockey {
  id: string;
  name: string;
  license: string;
  org: string;
  wins: number;
  starts: number;
  rating: number;
  points: number;
  status: Status;
  avatar: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: Status;
  joined: string;
  lastActive: string;
  license?: string;
  org?: string;
}

export interface Registration {
  id: string;
  horse: string;
  horseId: string;
  owner: string;
  race: string;
  raceId: string;
  tournament: string;
  submitted: string;
  status: Status;
  note?: string;
}

export interface Invitation {
  id: string;
  horse: string;
  horseId: string;
  race: string;
  raceId: string;
  jockey: string;
  jockeyId: string;
  sentAt: string;
  status: Status;
  owner: string;
}

export interface BetOption {
  id: string;
  race: string;
  raceId: string;
  horse: string;
  horseId: string;
  rate: number;
  totalStaked: number;
  tickets: number;
  status: Status;
}

export interface Prediction {
  id: string;
  race: string;
  raceId: string;
  horse: string;
  horseId: string;
  stake: number;
  rate: number;
  potential: number;
  placedAt: string;
  status: Status;
}

export interface RaceResultRow {
  pos: number;
  horse: string;
  jockey: string;
  gate: number;
  time: string;
  margin: string;
  points: number;
  prize: number;
}

export interface Result {
  id: string;
  race: string;
  raceId: string;
  tournament: string;
  date: string;
  trackType: "Turf" | "Dirt" | "Synthetic";
  distance: number;
  status: Status;
  rows: RaceResultRow[];
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: "race" | "wallet" | "system" | "registration" | "result";
  audience: string;
  createdAt: string;
  status: Status;
}

export interface WalletTx {
  id: string;
  type: "topup" | "stake" | "payout" | "refund";
  method: string;
  amount: number;
  status: Status;
  date: string;
  ref: string;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}
