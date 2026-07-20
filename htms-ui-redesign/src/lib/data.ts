import type {
  BetOption,
  Horse,
  Invitation,
  Jockey,
  Notification,
  Prediction,
  Race,
  Registration,
  Result,
  Role,
  ScheduleDay,
  Tournament,
  User,
  WalletTx,
} from "./types";

/* ----------------------------- Imagery ----------------------------- */
export const IMG = {
  heroRace:
    "https://images.pexels.com/photos/13055808/pexels-photo-13055808.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1400&h=900",
  raceGate:
    "https://images.pexels.com/photos/27305816/pexels-photo-27305816.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=800",
  raceCrowd:
    "https://images.pexels.com/photos/28560413/pexels-photo-28560413.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=800",
  raceAction:
    "https://images.pexels.com/photos/17368610/pexels-photo-17368610.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=800",
  jockeysNeck:
    "https://images.pexels.com/photos/17368527/pexels-photo-17368527.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1100&h=750",
  jockeyMid:
    "https://images.pexels.com/photos/12950626/pexels-photo-12950626.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1100&h=750",
  startGates:
    "https://images.pexels.com/photos/12950446/pexels-photo-12950446.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1100&h=750",
  hChestnut:
    "https://images.pexels.com/photos/38198579/pexels-photo-38198579.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=600&h=700",
  hBlack:
    "https://images.pexels.com/photos/32523782/pexels-photo-32523782.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=600&h=700",
  hBrown:
    "https://images.pexels.com/photos/7882342/pexels-photo-7882342.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=600&h=700",
  hChestnut2:
    "https://images.pexels.com/photos/35382652/pexels-photo-35382652.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=600&h=700",
  hBridle:
    "https://images.pexels.com/photos/32393639/pexels-photo-32393639.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=600&h=700",
};

/* --------------------------- Status tones -------------------------- */
export type Tone =
  | "emerald"
  | "gold"
  | "red"
  | "slate"
  | "blue"
  | "violet";

export const STATUS_META: Record<string, { tone: Tone; label: string }> = {
  active: { tone: "emerald", label: "Active" },
  inactive: { tone: "slate", label: "Inactive" },
  pending: { tone: "gold", label: "Pending" },
  approved: { tone: "emerald", label: "Approved" },
  rejected: { tone: "red", label: "Rejected" },
  confirmed: { tone: "emerald", label: "Confirmed" },
  accepted: { tone: "emerald", label: "Accepted" },
  scheduled: { tone: "blue", label: "Scheduled" },
  ongoing: { tone: "emerald", label: "Live" },
  completed: { tone: "slate", label: "Completed" },
  cancelled: { tone: "red", label: "Cancelled" },
  open: { tone: "emerald", label: "Open" },
  closed: { tone: "slate", label: "Closed" },
  draft: { tone: "slate", label: "Draft" },
  published: { tone: "blue", label: "Published" },
  won: { tone: "emerald", label: "Won" },
  lost: { tone: "red", label: "Lost" },
  settled: { tone: "slate", label: "Settled" },
  success: { tone: "emerald", label: "Success" },
  failed: { tone: "red", label: "Failed" },
  unread: { tone: "gold", label: "Unread" },
  read: { tone: "slate", label: "Read" },
};

export const ROLE_META: Record<
  Role,
  { label: string; tone: Tone; icon: string; blurb: string }
> = {
  admin: { label: "Admin", tone: "violet", icon: "Shield", blurb: "Full operations control" },
  owner: { label: "Horse Owner", tone: "emerald", icon: "Home", blurb: "Manage your stable & entries" },
  jockey: { label: "Jockey", tone: "blue", icon: "UserRound", blurb: "Accept rides & compete" },
  referee: { label: "Race Referee", tone: "gold", icon: "Flag", blurb: "Officiate & report races" },
  spectator: { label: "Spectator", tone: "red", icon: "Eye", blurb: "Predict, bet & follow" },
};

/* ----------------------------- Tournaments ----------------------------- */
export const tournaments: Tournament[] = [
  {
    id: "t1",
    code: "SGP-2026",
    name: "Saigon Grand Prix 2026",
    venue: "Phu Tho Turf Club",
    city: "Ho Chi Minh City",
    startDate: "2026-03-14",
    endDate: "2026-03-21",
    status: "ongoing",
    prizePool: 2400000000,
    races: 24,
    participants: 168,
    capacity: 200,
    cover: IMG.raceGate,
    tier: "Premier",
  },
  {
    id: "t2",
    code: "HCC-2026",
    name: "Hanoi Classic Cup",
    venue: "Hanoi Racecourse",
    city: "Hanoi",
    startDate: "2026-04-09",
    endDate: "2026-04-12",
    status: "scheduled",
    prizePool: 1800000000,
    races: 18,
    participants: 132,
    capacity: 180,
    cover: IMG.raceAction,
    tier: "Classic",
  },
  {
    id: "t3",
    code: "DNC-2026",
    name: "Delta Night Championship",
    venue: "Can Tho Arena",
    city: "Can Tho",
    startDate: "2026-02-20",
    endDate: "2026-02-23",
    status: "completed",
    prizePool: 950000000,
    races: 14,
    participants: 96,
    capacity: 140,
    cover: IMG.raceCrowd,
    tier: "Open",
  },
  {
    id: "t4",
    code: "CCD-2026",
    name: "Coastal Derby",
    venue: "Da Nang Turf",
    city: "Da Nang",
    startDate: "2026-05-02",
    endDate: "2026-05-05",
    status: "scheduled",
    prizePool: 1200000000,
    races: 16,
    participants: 44,
    capacity: 160,
    cover: IMG.startGates,
    tier: "Classic",
  },
  {
    id: "t5",
    code: "HRW-2026",
    name: "Highland Rush Winter",
    venue: "Da Lat Turf Club",
    city: "Da Lat",
    startDate: "2026-01-10",
    endDate: "2026-01-12",
    status: "completed",
    prizePool: 720000000,
    races: 12,
    participants: 80,
    capacity: 120,
    cover: IMG.jockeysNeck,
    tier: "Open",
  },
  {
    id: "t6",
    code: "MEC-2026",
    name: "Mekong Sprint Open",
    venue: "Vinh Long Arena",
    city: "Vinh Long",
    startDate: "2026-06-18",
    endDate: "2026-06-21",
    status: "draft",
    prizePool: 0,
    races: 0,
    participants: 0,
    capacity: 150,
    cover: IMG.heroRace,
    tier: "Open",
  },
];

/* ------------------------------ Schedules ------------------------------ */
export const schedules: ScheduleDay[] = [
  { id: "s1", tournamentId: "t1", date: "2026-03-14", label: "Opening Day", gates: "13:00", races: 6, status: "completed" },
  { id: "s2", tournamentId: "t1", date: "2026-03-16", label: "Midweek Sprints", gates: "14:00", races: 6, status: "ongoing" },
  { id: "s3", tournamentId: "t1", date: "2026-03-18", label: "Classic Trials", gates: "13:30", races: 6, status: "scheduled" },
  { id: "s4", tournamentId: "t1", date: "2026-03-21", label: "Grand Final Day", gates: "15:00", races: 6, status: "scheduled" },
  { id: "s5", tournamentId: "t2", date: "2026-04-09", label: "Cup Day 1", gates: "14:00", races: 5, status: "scheduled" },
  { id: "s6", tournamentId: "t2", date: "2026-04-12", label: "Cup Final", gates: "15:00", races: 5, status: "scheduled" },
];

/* -------------------------------- Races -------------------------------- */
export const races: Race[] = [
  { id: "r1", tournamentId: "t1", tournament: "Saigon Grand Prix 2026", scheduleId: "s2", name: "Phu Tho Maiden Plate", number: 1, rankGroup: "Group C", scheduledAt: "2026-03-16T14:00:00", predictionClose: "2026-03-16T13:45:00", distance: 1200, laps: 1, maxHorses: 12, enteredHorses: 10, maxReferees: 3, assignedReferees: 3, trackType: "Turf", status: "ongoing", prize: 90000000 },
  { id: "r2", tournamentId: "t1", tournament: "Saigon Grand Prix 2026", scheduleId: "s2", name: "Orchard Sprint Stakes", number: 2, rankGroup: "Group B", scheduledAt: "2026-03-16T14:35:00", predictionClose: "2026-03-16T14:20:00", distance: 1400, laps: 1, maxHorses: 14, enteredHorses: 12, maxReferees: 3, assignedReferees: 2, trackType: "Turf", status: "scheduled", prize: 120000000 },
  { id: "r3", tournamentId: "t1", tournament: "Saigon Grand Prix 2026", scheduleId: "s2", name: "Delta Handicap", number: 3, rankGroup: "Group A", scheduledAt: "2026-03-16T15:10:00", predictionClose: "2026-03-16T14:55:00", distance: 1600, laps: 1, maxHorses: 14, enteredHorses: 8, maxReferees: 3, assignedReferees: 1, trackType: "Turf", status: "scheduled", prize: 180000000 },
  { id: "r4", tournamentId: "t1", tournament: "Saigon Grand Prix 2026", scheduleId: "s1", name: "Opening Cup", number: 4, rankGroup: "Group A", scheduledAt: "2026-03-14T15:30:00", predictionClose: "2026-03-14T15:15:00", distance: 1800, laps: 1, maxHorses: 12, enteredHorses: 12, maxReferees: 3, assignedReferees: 3, trackType: "Turf", status: "completed", prize: 220000000 },
  { id: "r5", tournamentId: "t1", tournament: "Saigon Grand Prix 2026", scheduleId: "s3", name: "Emerald Mile", number: 5, rankGroup: "Group B", scheduledAt: "2026-03-18T14:00:00", predictionClose: "2026-03-18T13:45:00", distance: 1600, laps: 1, maxHorses: 14, enteredHorses: 6, maxReferees: 3, assignedReferees: 0, trackType: "Turf", status: "scheduled", prize: 130000000 },
  { id: "r6", tournamentId: "t1", tournament: "Saigon Grand Prix 2026", scheduleId: "s4", name: "Grand Prix Final", number: 8, rankGroup: "Group A", scheduledAt: "2026-03-21T16:00:00", predictionClose: "2026-03-21T15:45:00", distance: 2000, laps: 1, maxHorses: 14, enteredHorses: 4, maxReferees: 4, assignedReferees: 0, trackType: "Turf", status: "scheduled", prize: 500000000 },
  { id: "r7", tournamentId: "t1", tournament: "Saigon Grand Prix 2026", scheduleId: "s1", name: "Riverside Dash", number: 2, rankGroup: "Group C", scheduledAt: "2026-03-14T14:10:00", predictionClose: "2026-03-14T13:55:00", distance: 1000, laps: 1, maxHorses: 12, enteredHorses: 11, maxReferees: 3, assignedReferees: 3, trackType: "Turf", status: "completed", prize: 75000000 },
  { id: "r8", tournamentId: "t2", tournament: "Hanoi Classic Cup", scheduleId: "s5", name: "Red River Stakes", number: 1, rankGroup: "Group B", scheduledAt: "2026-04-09T14:30:00", predictionClose: "2026-04-09T14:15:00", distance: 1500, laps: 1, maxHorses: 14, enteredHorses: 0, maxReferees: 3, assignedReferees: 0, trackType: "Dirt", status: "scheduled", prize: 140000000 },
  { id: "r9", tournamentId: "t4", tournament: "Coastal Derby", scheduleId: "s5", name: "Ocean Sprint", number: 3, rankGroup: "Group C", scheduledAt: "2026-05-02T15:00:00", predictionClose: "2026-05-02T14:45:00", distance: 1100, laps: 1, maxHorses: 12, enteredHorses: 0, maxReferees: 3, assignedReferees: 0, trackType: "Synthetic", status: "scheduled", prize: 95000000 },
];

/* -------------------------------- Horses -------------------------------- */
export const horses: Horse[] = [
  { id: "h1", name: "Midnight Thunder", breed: "Vietnamese TB", age: 5, weight: 462, owner: "Nguyen Van An", ownerStable: "Red Dragon Stables", rankGroup: "Group A", points: 2480, wins: 12, starts: 22, status: "active", avatar: IMG.hBlack, color: "black" },
  { id: "h2", name: "Golden Mirage", breed: "Arabian Cross", age: 4, weight: 438, owner: "Tran Thi Binh", ownerStable: "Golden Hoof Racing", rankGroup: "Group A", points: 2310, wins: 10, starts: 18, status: "active", avatar: IMG.hChestnut, color: "chestnut" },
  { id: "h3", name: "Phantom Strike", breed: "Vietnamese TB", age: 6, weight: 471, owner: "Le Hoang Cuong", ownerStable: "Phantom Syndicate", rankGroup: "Group A", points: 2240, wins: 11, starts: 25, status: "active", avatar: IMG.hBrown, color: "bay" },
  { id: "h4", name: "Emerald Dasher", breed: "Thoroughbred", age: 3, weight: 421, owner: "Nguyen Van An", ownerStable: "Red Dragon Stables", rankGroup: "Group B", points: 1620, wins: 6, starts: 14, status: "active", avatar: IMG.hChestnut2, color: "chestnut" },
  { id: "h5", name: "Silver Comet", breed: "Thoroughbred", age: 5, weight: 455, owner: "Pham Minh Duc", ownerStable: "Comet Acres", rankGroup: "Group B", points: 1540, wins: 7, starts: 19, status: "pending", avatar: IMG.hBridle, color: "grey" },
  { id: "h6", name: "Desert Falcon", breed: "Arabian Cross", age: 4, weight: 440, owner: "Tran Thi Binh", ownerStable: "Golden Hoof Racing", rankGroup: "Group B", points: 1480, wins: 5, starts: 16, status: "active", avatar: IMG.hChestnut, color: "chestnut" },
  { id: "h7", name: "Storm Bringer", breed: "Vietnamese TB", age: 7, weight: 488, owner: "Le Hoang Cuong", ownerStable: "Phantom Syndicate", rankGroup: "Group A", points: 2090, wins: 14, starts: 31, status: "active", avatar: IMG.hBlack, color: "black" },
  { id: "h8", name: "Crimson Arrow", breed: "Thoroughbred", age: 4, weight: 433, owner: "Nguyen Van An", ownerStable: "Red Dragon Stables", rankGroup: "Group C", points: 980, wins: 3, starts: 12, status: "active", avatar: IMG.hChestnut2, color: "chestnut" },
  { id: "h9", name: "Northern Gale", breed: "Thoroughbred", age: 6, weight: 469, owner: "Vo Thi Em", ownerStable: "Gale Farm", rankGroup: "Group A", points: 1960, wins: 9, starts: 24, status: "active", avatar: IMG.hBrown, color: "bay" },
  { id: "h10", name: "Lunar Whisper", breed: "Arabian Cross", age: 3, weight: 416, owner: "Pham Minh Duc", ownerStable: "Comet Acres", rankGroup: "Group C", points: 720, wins: 2, starts: 9, status: "pending", avatar: IMG.hBridle, color: "grey" },
  { id: "h11", name: "Iron Vanguard", breed: "Vietnamese TB", age: 5, weight: 459, owner: "Tran Thi Binh", ownerStable: "Golden Hoof Racing", rankGroup: "Group B", points: 1410, wins: 6, starts: 20, status: "inactive", avatar: IMG.hChestnut, color: "chestnut" },
  { id: "h12", name: "Azure Bolt", breed: "Thoroughbred", age: 4, weight: 444, owner: "Nguyen Van An", ownerStable: "Red Dragon Stables", rankGroup: "Group B", points: 1350, wins: 5, starts: 15, status: "active", avatar: IMG.hBridle, color: "grey" },
];

/* ------------------------------- Jockeys ------------------------------- */
export const jockeys: Jockey[] = [
  { id: "j1", name: "Vo Quoc Hung", license: "JC-VN-1042", org: "Independent", wins: 142, starts: 410, rating: 92, points: 2680, status: "active", avatar: IMG.jockeyMid },
  { id: "j2", name: "Dang Thi Mai", license: "JC-VN-1188", org: "Golden Hoof Racing", wins: 128, starts: 388, rating: 89, points: 2410, status: "active", avatar: IMG.jockeysNeck },
  { id: "j3", name: "Bui Tuan Anh", license: "JC-VN-1290", org: "Red Dragon Stables", wins: 119, starts: 402, rating: 87, points: 2230, status: "active", avatar: IMG.startGates },
  { id: "j4", name: "Cao Huynh Nhu", license: "JC-VN-1377", org: "Phantom Syndicate", wins: 96, starts: 301, rating: 84, points: 1980, status: "active", avatar: IMG.jockeyMid },
  { id: "j5", name: "Do Minh Khai", license: "JC-VN-1402", org: "Independent", wins: 88, starts: 290, rating: 83, points: 1840, status: "active", avatar: IMG.jockeysNeck },
  { id: "j6", name: "Ngo Thanh Long", license: "JC-VN-1455", org: "Comet Acres", wins: 74, starts: 256, rating: 81, points: 1620, status: "active", avatar: IMG.startGates },
];

/* -------------------------------- Users -------------------------------- */
export const users: User[] = [
  { id: "u1", name: "Nguyen Van An", email: "an.nguyen@reddragon.vn", role: "owner", status: "active", joined: "2025-11-02", lastActive: "2026-03-16T09:12:00", org: "Red Dragon Stables", license: "OWN-VN-2201" },
  { id: "u2", name: "Tran Thi Binh", email: "binh.tran@goldenhoof.vn", role: "owner", status: "active", joined: "2025-11-21", lastActive: "2026-03-15T18:40:00", org: "Golden Hoof Racing", license: "OWN-VN-2243" },
  { id: "u3", name: "Vo Quoc Hung", email: "hung.vo@jockey.vn", role: "jockey", status: "active", joined: "2025-10-15", lastActive: "2026-03-16T08:55:00", license: "JC-VN-1042" },
  { id: "u4", name: "Cao Huynh Nhu", email: "nhu.cao@jockey.vn", role: "jockey", status: "active", joined: "2025-12-01", lastActive: "2026-03-14T20:10:00", license: "JC-VN-1377" },
  { id: "u5", name: "Le Hoang Cuong", email: "cuong.le@phantom.vn", role: "owner", status: "pending", joined: "2026-03-10", lastActive: "2026-03-10T11:00:00", org: "Phantom Syndicate", license: "OWN-VN-2290" },
  { id: "u6", name: "Pham Minh Duc", email: "duc.pham@comet.vn", role: "owner", status: "active", joined: "2025-12-18", lastActive: "2026-03-13T16:22:00", org: "Comet Acres", license: "OWN-VN-2266" },
  { id: "u7", name: "Tran Khanh Linh", email: "linh.tran@htms.vn", role: "referee", status: "active", joined: "2025-09-30", lastActive: "2026-03-16T07:30:00", license: "REF-VN-0188" },
  { id: "u8", name: "Hoang Duc Manh", email: "manh.hoang@htms.vn", role: "referee", status: "active", joined: "2025-10-05", lastActive: "2026-03-15T22:05:00", license: "REF-VN-0192" },
  { id: "u9", name: "Bui Tuan Anh", email: "anh.bui@jockey.vn", role: "jockey", status: "inactive", joined: "2025-10-20", lastActive: "2026-02-28T10:15:00", license: "JC-VN-1290" },
  { id: "u10", name: "Dang Quoc Bao", email: "bao.dang@htms.vn", role: "admin", status: "active", joined: "2025-08-11", lastActive: "2026-03-16T06:00:00" },
  { id: "u11", name: "Le Gia Bao", email: "gia.bao@gmail.com", role: "spectator", status: "active", joined: "2026-01-12", lastActive: "2026-03-16T12:40:00" },
  { id: "u12", name: "Nguyen Phuong Vy", email: "vy.nguyen@gmail.com", role: "spectator", status: "active", joined: "2026-02-02", lastActive: "2026-03-15T19:30:00" },
];

/* --------------------------- Registrations --------------------------- */
export const registrations: Registration[] = [
  { id: "reg1", horse: "Midnight Thunder", horseId: "h1", owner: "Red Dragon Stables", race: "Grand Prix Final", raceId: "r6", tournament: "Saigon Grand Prix 2026", submitted: "2026-03-15T10:20:00", status: "pending" },
  { id: "reg2", horse: "Golden Mirage", horseId: "h2", owner: "Golden Hoof Racing", race: "Delta Handicap", raceId: "r3", tournament: "Saigon Grand Prix 2026", submitted: "2026-03-15T11:02:00", status: "pending" },
  { id: "reg3", horse: "Emerald Dasher", horseId: "h4", owner: "Red Dragon Stables", race: "Emerald Mile", raceId: "r5", tournament: "Saigon Grand Prix 2026", submitted: "2026-03-14T16:48:00", status: "approved" },
  { id: "reg4", horse: "Desert Falcon", horseId: "h6", owner: "Golden Hoof Racing", race: "Orchard Sprint Stakes", raceId: "r2", tournament: "Saigon Grand Prix 2026", submitted: "2026-03-14T17:30:00", status: "approved" },
  { id: "reg5", horse: "Silver Comet", horseId: "h5", owner: "Comet Acres", race: "Delta Handicap", raceId: "r3", tournament: "Saigon Grand Prix 2026", submitted: "2026-03-15T08:14:00", status: "rejected", note: "Rank group mismatch — horse pending Group B certification." },
  { id: "reg6", horse: "Storm Bringer", horseId: "h7", owner: "Phantom Syndicate", race: "Phu Tho Maiden Plate", raceId: "r1", tournament: "Saigon Grand Prix 2026", submitted: "2026-03-13T09:00:00", status: "approved" },
  { id: "reg7", horse: "Azure Bolt", horseId: "h12", owner: "Red Dragon Stables", race: "Emerald Mile", raceId: "r5", tournament: "Saigon Grand Prix 2026", submitted: "2026-03-15T13:25:00", status: "pending" },
  { id: "reg8", horse: "Northern Gale", horseId: "h9", owner: "Gale Farm", race: "Grand Prix Final", raceId: "r6", tournament: "Saigon Grand Prix 2026", submitted: "2026-03-15T14:50:00", status: "pending" },
];

/* ----------------------------- Invitations ----------------------------- */
export const invitations: Invitation[] = [
  { id: "inv1", horse: "Midnight Thunder", horseId: "h1", race: "Grand Prix Final", raceId: "r6", jockey: "Vo Quoc Hung", jockeyId: "j1", sentAt: "2026-03-15T10:25:00", status: "accepted", owner: "Red Dragon Stables" },
  { id: "inv2", horse: "Emerald Dasher", horseId: "h4", race: "Emerald Mile", raceId: "r5", jockey: "Dang Thi Mai", jockeyId: "j2", sentAt: "2026-03-14T17:00:00", status: "pending", owner: "Red Dragon Stables" },
  { id: "inv3", horse: "Desert Falcon", horseId: "h6", race: "Orchard Sprint Stakes", raceId: "r2", jockey: "Bui Tuan Anh", jockeyId: "j3", sentAt: "2026-03-14T17:35:00", status: "confirmed", owner: "Golden Hoof Racing" },
  { id: "inv4", horse: "Azure Bolt", horseId: "h12", race: "Emerald Mile", raceId: "r5", jockey: "Ngo Thanh Long", jockeyId: "j6", sentAt: "2026-03-15T13:30:00", status: "pending", owner: "Red Dragon Stables" },
  { id: "inv5", horse: "Storm Bringer", horseId: "h7", race: "Phu Tho Maiden Plate", raceId: "r1", jockey: "Cao Huynh Nhu", jockeyId: "j4", sentAt: "2026-03-13T09:10:00", status: "confirmed", owner: "Phantom Syndicate" },
  { id: "inv6", horse: "Golden Mirage", horseId: "h2", race: "Delta Handicap", raceId: "r3", jockey: "Do Minh Khai", jockeyId: "j5", sentAt: "2026-03-15T11:10:00", status: "pending", owner: "Golden Hoof Racing" },
];

/* ----------------------------- Bet options ----------------------------- */
export const betOptions: BetOption[] = [
  { id: "b1", race: "Orchard Sprint Stakes", raceId: "r2", horse: "Phantom Strike", horseId: "h3", rate: 3.2, totalStaked: 184000, tickets: 312, status: "open" },
  { id: "b2", race: "Orchard Sprint Stakes", raceId: "r2", horse: "Desert Falcon", horseId: "h6", rate: 4.5, totalStaked: 142000, tickets: 248, status: "open" },
  { id: "b3", race: "Orchard Sprint Stakes", raceId: "r2", horse: "Storm Bringer", horseId: "h7", rate: 2.1, totalStaked: 268000, tickets: 451, status: "open" },
  { id: "b4", race: "Delta Handicap", raceId: "r3", horse: "Golden Mirage", horseId: "h2", rate: 2.8, totalStaked: 156000, tickets: 280, status: "open" },
  { id: "b5", race: "Delta Handicap", raceId: "r3", horse: "Northern Gale", horseId: "h9", rate: 3.6, totalStaked: 121000, tickets: 212, status: "open" },
  { id: "b6", race: "Phu Tho Maiden Plate", raceId: "r1", horse: "Storm Bringer", horseId: "h7", rate: 1.9, totalStaked: 0, tickets: 0, status: "closed" },
];

/* ----------------------------- Predictions ----------------------------- */
export const predictions: Prediction[] = [
  { id: "p1", race: "Orchard Sprint Stakes", raceId: "r2", horse: "Storm Bringer", horseId: "h7", stake: 500, rate: 2.1, potential: 1050, placedAt: "2026-03-16T13:50:00", status: "open" },
  { id: "p2", race: "Delta Handicap", raceId: "r3", horse: "Golden Mirage", horseId: "h2", stake: 800, rate: 2.8, potential: 2240, placedAt: "2026-03-16T13:10:00", status: "open" },
  { id: "p3", race: "Opening Cup", raceId: "r4", horse: "Midnight Thunder", horseId: "h1", stake: 600, rate: 2.4, potential: 1440, placedAt: "2026-03-14T14:40:00", status: "won" },
  { id: "p4", race: "Riverside Dash", raceId: "r7", horse: "Crimson Arrow", horseId: "h8", stake: 300, rate: 5.0, potential: 1500, placedAt: "2026-03-14T13:30:00", status: "lost" },
  { id: "p5", race: "Opening Cup", raceId: "r4", horse: "Northern Gale", horseId: "h9", stake: 400, rate: 3.1, potential: 1240, placedAt: "2026-03-14T14:55:00", status: "lost" },
  { id: "p6", race: "Riverside Dash", raceId: "r7", horse: "Emerald Dasher", horseId: "h4", stake: 250, rate: 3.8, potential: 950, placedAt: "2026-03-14T13:40:00", status: "won" },
];

/* ------------------------------- Results ------------------------------- */
export const results: Result[] = [
  {
    id: "res4", race: "Opening Cup", raceId: "r4", tournament: "Saigon Grand Prix 2026", date: "2026-03-14T15:30:00", trackType: "Turf", distance: 1800, status: "published",
    rows: [
      { pos: 1, horse: "Midnight Thunder", jockey: "Vo Quoc Hung", gate: 4, time: "1:48.62", margin: "—", points: 100, prize: 110000000 },
      { pos: 2, horse: "Storm Bringer", jockey: "Cao Huynh Nhu", gate: 7, time: "1:48.91", margin: "1¾L", points: 70, prize: 55000000 },
      { pos: 3, horse: "Northern Gale", jockey: "Do Minh Khai", gate: 2, time: "1:49.30", margin: "2¼L", points: 45, prize: 27500000 },
      { pos: 4, horse: "Phantom Strike", jockey: "Bui Tuan Anh", gate: 9, time: "1:49.55", margin: "1L", points: 25, prize: 11000000 },
      { pos: 5, horse: "Iron Vanguard", jockey: "Ngo Thanh Long", gate: 5, time: "1:49.80", margin: "1L", points: 10, prize: 5500000 },
      { pos: 6, horse: "Azure Bolt", jockey: "Dang Thi Mai", gate: 11, time: "1:50.12", margin: "1¾L", points: 0, prize: 0 },
    ],
  },
  {
    id: "res7", race: "Riverside Dash", raceId: "r7", tournament: "Saigon Grand Prix 2026", date: "2026-03-14T14:10:00", trackType: "Turf", distance: 1000, status: "published",
    rows: [
      { pos: 1, horse: "Emerald Dasher", jockey: "Vo Quoc Hung", gate: 3, time: "0:58.21", margin: "—", points: 100, prize: 37500000 },
      { pos: 2, horse: "Crimson Arrow", jockey: "Dang Thi Mai", gate: 6, time: "0:58.44", margin: "1L", points: 70, prize: 18750000 },
      { pos: 3, horse: "Lunar Whisper", jockey: "Ngo Thanh Long", gate: 1, time: "0:58.70", margin: "1L", points: 45, prize: 9375000 },
      { pos: 4, horse: "Azure Bolt", jockey: "Bui Tuan Anh", gate: 8, time: "0:59.02", margin: "1¾L", points: 25, prize: 3750000 },
    ],
  },
];

/* ---------------------------- Notifications ---------------------------- */
export const notifications: Notification[] = [
  { id: "n1", title: "Race 1 — Phu Tho Maiden Plate is now LIVE", body: "Gates opened. Prediction window closed for Race 1. Follow live standings on Race Control.", type: "race", audience: "All roles", createdAt: "2026-03-16T14:00:00", status: "unread" },
  { id: "n2", title: "Registration approved: Emerald Dasher → Emerald Mile", body: "Your entry for Race 5 (Emerald Mile) has been approved by the tournament committee.", type: "registration", audience: "Horse Owners", createdAt: "2026-03-14T17:05:00", status: "unread" },
  { id: "n3", title: "Payout settled: Opening Cup +1,440 pts", body: "Your winning prediction on Midnight Thunder has been credited to your wallet.", type: "wallet", audience: "Spectators", createdAt: "2026-03-14T15:42:00", status: "read" },
  { id: "n4", title: "Jockey invitation accepted by Vo Quoc Hung", body: "Vo Quoc Hung accepted the ride on Midnight Thunder for the Grand Prix Final.", type: "system", audience: "Horse Owners", createdAt: "2026-03-15T10:40:00", status: "read" },
  { id: "n5", title: "New tournament published: Coastal Derby", body: "Registration opens 2026-04-20 for the Coastal Derby at Da Nang Turf.", type: "system", audience: "All roles", createdAt: "2026-03-12T09:00:00", status: "read" },
];

/* ------------------------------ Wallet TXs ------------------------------ */
export const walletTxs: WalletTx[] = [
  { id: "w1", type: "payout", method: "Prediction payout", amount: 1440, status: "success", date: "2026-03-14T15:42:00", ref: "PAY-2026-04412" },
  { id: "w2", type: "topup", method: "VNPay QR", amount: 2000, status: "success", date: "2026-03-12T20:11:00", ref: "VNP-2026-99201" },
  { id: "w3", type: "stake", method: "Prediction stake", amount: -600, status: "settled", date: "2026-03-14T14:40:00", ref: "STK-2026-33128" },
  { id: "w4", type: "payout", method: "Prediction payout", amount: 950, status: "success", date: "2026-03-14T14:12:00", ref: "PAY-2026-04398" },
  { id: "w5", type: "topup", method: "VNPay ATM", amount: 1000, status: "failed", date: "2026-03-11T08:33:00", ref: "VNP-2026-99004" },
  { id: "w6", type: "refund", method: "Cancelled race refund", amount: 500, status: "success", date: "2026-03-09T16:20:00", ref: "RFD-2026-22100" },
];

/* ------------------------- Current user per role ------------------------ */
export const CURRENT: Record<Role, User> = {
  admin: users.find((u) => u.role === "admin")!,
  owner: users.find((u) => u.role === "owner")!,
  jockey: users.find((u) => u.role === "jockey" && u.status === "active")!,
  referee: users.find((u) => u.role === "referee")!,
  spectator: users.find((u) => u.role === "spectator")!,
};

export const WALLET = {
  balance: 3290,
  pending: 1050,
  lifetimeStaked: 18400,
  lifetimeWon: 7320,
  winRate: 58,
};

/* --------------------------- Owner-scoped data -------------------------- */
export const OWNER = {
  stable: "Red Dragon Stables",
  ownerName: "Nguyen Van An",
  horses: horses.filter((h) => h.ownerStable === "Red Dragon Stables"),
};

/* ------------------------- Onboarding role cards ------------------------ */
export const ONBOARD_ROLES = [
  { role: "owner" as Role, title: "Horse Owner", icon: "Home", desc: "Register horses, enter races and assign jockeys for your stable." },
  { role: "jockey" as Role, title: "Jockey", icon: "UserRound", desc: "Receive ride invitations, compete and track your ranking." },
  { role: "referee" as Role, title: "Race Referee", icon: "Flag", desc: "Officiate races, submit reports and confirm official results." },
  { role: "spectator" as Role, title: "Spectator", icon: "Eye", desc: "Predict outcomes, manage your wallet and follow live action." },
];

/* Quick stats for landing / shared */
export const GLOBAL_STATS = {
  tournaments: 6,
  activeRaces: 9,
  horses: 12,
  jockeys: 6,
  prizePaid: 5100000000,
};
