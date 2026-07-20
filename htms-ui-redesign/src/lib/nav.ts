import type { NavGroup, Role } from "./types";

export const NAV: Record<Role, NavGroup[]> = {
  admin: [
    {
      label: "Operations",
      items: [
        { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard" },
        { id: "tournaments", label: "Tournaments", icon: "Trophy" },
        { id: "schedule", label: "Race Programme", icon: "CalendarDays" },
        { id: "schedules-admin", label: "Schedule Mgmt", icon: "CalendarClock" },
        { id: "races", label: "Races", icon: "Flag" },
        { id: "race-control", label: "Race Control", icon: "Radio" },
      ],
    },
    {
      label: "Registry",
      items: [
        { id: "horses-admin", label: "Horses", icon: "Cookie" },
        { id: "registrations", label: "Registrations", icon: "ClipboardList", badge: 4 },
        { id: "users", label: "Users", icon: "Users" },
        { id: "bets", label: "Bets & Markets", icon: "Coins" },
      ],
    },
    {
      label: "Insights",
      items: [
        { id: "results", label: "Results", icon: "ListOrdered" },
        { id: "rankings", label: "Rankings", icon: "BarChart3" },
        { id: "notifications", label: "Notifications", icon: "Bell" },
      ],
    },
  ],
  owner: [
    {
      label: "Stable",
      items: [
        { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard" },
        { id: "horses", label: "My Horses", icon: "Cookie" },
        { id: "entry", label: "Race Entry", icon: "ClipboardPlus" },
        { id: "invitations", label: "Jockey Invites", icon: "UserPlus", badge: 3 },
      ],
    },
    {
      label: "Compete",
      items: [
        { id: "race-schedule", label: "Race Schedule", icon: "CalendarClock" },
        { id: "results", label: "Results", icon: "ListOrdered" },
        { id: "rankings", label: "Rankings", icon: "BarChart3" },
      ],
    },
    {
      label: "Account",
      items: [
        { id: "notifications", label: "Notifications", icon: "Bell" },
        { id: "wallet", label: "Wallet", icon: "Wallet" },
        { id: "profile", label: "Profile", icon: "UserCircle" },
      ],
    },
  ],
  jockey: [
    {
      label: "Rides",
      items: [
        { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard" },
        { id: "invitations", label: "Invitations", icon: "Inbox", badge: 3 },
        { id: "race-schedule", label: "Race Schedule", icon: "CalendarClock" },
      ],
    },
    {
      label: "Performance",
      items: [
        { id: "results", label: "Results", icon: "ListOrdered" },
        { id: "rankings", label: "Rankings", icon: "BarChart3" },
      ],
    },
    {
      label: "Account",
      items: [
        { id: "wallet", label: "Wallet", icon: "Wallet" },
        { id: "notifications", label: "Notifications", icon: "Bell" },
        { id: "profile", label: "Profile", icon: "UserCircle" },
      ],
    },
  ],
  referee: [
    {
      label: "Officiating",
      items: [
        { id: "race-control", label: "Race Control", icon: "Radio" },
        { id: "race-schedule", label: "Race Schedule", icon: "CalendarClock" },
      ],
    },
    {
      label: "Review",
      items: [
        { id: "results", label: "Results", icon: "ListOrdered" },
        { id: "notifications", label: "Notifications", icon: "Bell" },
        { id: "profile", label: "Profile", icon: "UserCircle" },
      ],
    },
  ],
  spectator: [
    {
      label: "Play",
      items: [
        { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard" },
        { id: "predictions", label: "Predictions", icon: "Target" },
        { id: "tracking", label: "Tracking", icon: "Activity" },
        { id: "wallet", label: "Wallet", icon: "Wallet" },
      ],
    },
    {
      label: "Follow",
      items: [
        { id: "results", label: "Results", icon: "ListOrdered" },
        { id: "rankings", label: "Rankings", icon: "BarChart3" },
        { id: "notifications", label: "Notifications", icon: "Bell" },
        { id: "profile", label: "Profile", icon: "UserCircle" },
      ],
    },
  ],
};

export const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  dashboard: { title: "Dashboard", sub: "Operational overview" },
  users: { title: "User Management", sub: "Accounts, roles & access" },
  tournaments: { title: "Tournament Management", sub: "Create & govern tournaments" },
  schedule: { title: "Tournament Schedule", sub: "Race-day programme" },
  "schedules-admin": { title: "Schedule Management", sub: "Build race days" },
  races: { title: "Race Management", sub: "Configure & operate races" },
  "horses-admin": { title: "Horse Management", sub: "Registry, requests & ranking" },
  registrations: { title: "Race Registration", sub: "Approve entry requests" },
  bets: { title: "Bet Management", sub: "Markets & odds" },
  "race-control": { title: "Race Control", sub: "Live operations terminal" },
  horses: { title: "My Horses", sub: "Your stable" },
  entry: { title: "Race Entry Registration", sub: "Enter horses into open races" },
  invitations: { title: "Jockey Invitations", sub: "Assign & confirm rides" },
  "race-schedule": { title: "Race Schedule", sub: "Upcoming programme" },
  results: { title: "Results", sub: "Official race results" },
  "result-detail": { title: "Race Result", sub: "Podium & full breakdown" },
  rankings: { title: "Rankings", sub: "Leaderboards" },
  notifications: { title: "Notifications", sub: "Operations inbox" },
  wallet: { title: "Wallet", sub: "Points & payments" },
  profile: { title: "Profile", sub: "Account & settings" },
  predictions: { title: "Predictions", sub: "Open markets & your stakes" },
  tracking: { title: "Prediction Tracking", sub: "Settlements & performance" },
};
