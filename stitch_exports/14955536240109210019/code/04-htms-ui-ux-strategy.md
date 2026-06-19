# HTMS UI/UX Planning & Wireframe Document

## 1. Project Vision
The Horse Racing Tournament Management System (HTMS) is a professional-grade platform designed to streamline racing operations, from registration to result publication and betting. The aesthetic is "Premium Sports Management" — high-contrast, dark-mode-first, with gold accents and high-density data visualization.

## 2. Navigation Architecture
### Public (Unauthenticated)
- **Landing Page**: Brand awareness, feature highlights, live odds teaser.
- **Auth Flow**: Role-based registration, login, and secure password recovery.

### Private (Authenticated - Shared Layout)
- **Sidebar**: Persistent, role-specific navigation.
- **Header**: Global search, Notifications, Profile (Role display).
- **Main View**: Dashboard-centric with breadcrumbs and primary action buttons.

## 3. Actor-Specific Flows
### Admin (The Controller)
- **Dashboard**: Global KPIs (Tournament health, betting volume).
- **User Management**: Approve/Reject owners/jockeys, manage roles.
- **Tournament CRUD**: End-to-end lifecycle management.
- **Referee/Result**: Assigning officials and certifying the final rankings.

### Horse Owner (The Competitor)
- **Stable Management**: Digital profiles for horses.
- **Invitations**: Search and invite jockeys for specific races.
- **Race Entry**: Formal registration for active tournaments.

### Jockey (The Performer)
- **Assignment Queue**: Accept/Reject invitations.
- **Race Schedule**: Personal calendar of upcoming rides.
- **Performance Analytics**: Ranking points and career stats.

### Referee (The Official)
- **Live Monitoring**: Disqualification and violation recording.
- **Report Submission**: Digital finish positions and official verdicts.

### Spectator (The Fan)
- **Live Viewer**: Real-time odds and race watching.
- **Wallet/Betting**: Transaction history and integrated betting slips.

## 4. Design Tokens & Components
- **Palette**: Surface: #0B1326 | Primary: #D4AF37 (Gold) | Success: #2E7D32.
- **Typography**: Montserrat (Headlines), Inter (Body/Data).
- **Icons**: Material Symbols (horse, leaderboard, wallet, settings).
- **Badges**: 
  - `Race`: [Scheduled] (Gray), [Live] (Red), [Finished] (Green).
  - `User`: [Admin] (Gold), [Jockey] (Blue), [Owner] (Purple).
