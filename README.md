# Horse Racing Tournament Management System (HTMS) - Frontend

<div align="center">

## Horse Racing Management Web Platform

Frontend-focused horse racing tournament management interface built with React, TypeScript, Vite, Tailwind CSS, and React Router.

![React](https://img.shields.io/badge/React-19.2.6-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0.2-3178C6)
![Vite](https://img.shields.io/badge/Vite-8.0.12-646CFF)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.3.0-38B2AC)
![Router](https://img.shields.io/badge/Router-React%20Router%207-CA4245)
![License](https://img.shields.io/badge/Status-UI%20Prototype-orange)

</div>

---

# Project Overview

Horse Racing Tournament Management System (HTMS) is a web platform designed to support horse racing tournament operations, race discovery, tournament schedules, race results, participant insights, and user access flows.

This repository contains the **frontend application** for the system. The current implementation focuses on a polished user interface under the **Horace** brand, including landing, race schedule, race results, and authentication screens.

The UI is currently powered by mock data inside React components. It is prepared for future backend integration through service modules and the existing `axios` dependency.

---

# Why This Project Matters

Horse racing tournament platforms need to present complex information in a way that is fast, transparent, and easy to scan.

Traditional race management and spectator-facing systems often struggle with:

* Scattered race schedules
* Limited visibility into tournament results
* Manual participant and performance tracking
* Weak user experience for spectators and tournament members
* Lack of a centralized interface for race data

HTMS addresses these needs through:

* A centralized web interface for racing information
* Clear race schedule and result views
* Dashboard-style presentation of top jockeys and champion horses
* A premium design system for high-density sports data
* A frontend foundation ready for API, authentication, and role-based workflows

---

# System Actors

The full HTMS platform is designed around five main actors:

| Role | Description |
| --- | --- |
| Admin | Manages tournaments, schedules, races, registrations, and system operations |
| Horse Owner | Registers horses, joins races, and manages horse participation |
| Jockey | Accepts race assignments and participates in races |
| Race Referee | Monitors races, reports violations, and confirms official results |
| Spectator | Views schedules/results, follows races, and participates in betting features |

Current frontend screens mainly support public/spectator-facing views and the initial authentication interface.

---

# Core Features

## Landing Experience

The home page includes:

* Full-width racing hero section
* Live race highlight badge
* Primary actions for live matches and historical data
* Trending race cards
* Top jockey ranking preview
* Champion horse cards

---

## Race Schedule

The schedule page displays upcoming races with:

* Race date and start time
* Track and location
* Race name and grade
* Distance and surface type
* Prize value
* Race detail and betting call-to-action buttons

---

## Race Results

The results page provides:

* Recent tournament result summaries
* Search input for race or horse lookup
* Winner ranking table
* Horse, jockey, finish time, and odds data
* Visual highlight for first-place result

---

## Authentication UI

The authentication page supports:

* Login and sign-up tab switching
* Navigation state sync from header actions
* Corporate email and password fields
* Full name field for account creation
* Premium split-screen branding layout on desktop

Note: authentication is currently UI-only and does not yet connect to a backend API.

---

## Shared Layout

The main application layout includes:

* Sticky header navigation
* Search input in desktop header
* Notification and user action icons
* Log In and Sign Up navigation
* Footer with legal/support links
* Responsive layout across desktop and mobile screen sizes

---

# Technology Stack

## Frontend

* React 19
* TypeScript
* Vite
* React Router DOM
* Tailwind CSS

---

## UI & Styling

* Tailwind theme tokens
* Custom `DESIGN.md` design system
* Lucide React icons
* Inter/system font stack
* Responsive grid and card layouts

---

## Utilities

* Axios for future API communication
* ESLint for code quality checks
* TypeScript build validation

---

# Application Architecture

## High-Level Architecture

```text
Browser
    |
React Application
    |
React Router
    |
Page Components
    |
Shared UI Components
    |
Mock Data / Future API Services
```

---

# Main Frontend Modules

## Routing

```text
src/routes/AppRoutes.tsx
```

Purpose:

Define application routes and decide which screens use the shared `MainLayout`.

---

## Pages

```text
src/pages/LandingPage.tsx
src/pages/SchedulePage.tsx
src/pages/ResultsPage.tsx
src/pages/AuthPage.tsx
```

Purpose:

Represent the main screens of the web application.

---

## Shared Components

```text
src/components/Header.tsx
src/components/Footer.tsx
src/components/MainLayout.tsx
src/components/Hero.tsx
src/components/TrendingRaces.tsx
src/components/StatsSection.tsx
```

Purpose:

Provide reusable layout, navigation, marketing, and dashboard-style UI sections.

---

## Design System

```text
DESIGN.md
src/index.css
tailwind.config.js
```

Purpose:

Store visual rules, theme tokens, typography, colors, spacing, and component styling conventions.

---

# Core UI Workflow

## Spectator Discovery Workflow

```text
Open Home Page
    |
View Live Race Highlight
    |
Browse Trending Races
    |
Check Top Jockeys / Champion Horses
    |
Navigate to Schedule or Results
```

---

## Race Schedule Workflow

```text
Open Race Schedule
    |
Review Upcoming Races
    |
Filter or View Today's Races
    |
Open Race Details
    |
Place Bet
```

Note: filtering, race details, and betting actions are present as UI actions and are not yet connected to business logic.

---

## Authentication Workflow

```text
Click Log In / Sign Up
    |
Navigate to /login
    |
Sync Active Auth Tab
    |
Submit Credentials
    |
Future Backend Authentication
```

---

# Source Code Structure

```text
.
|-- public
|   |-- favicon.svg
|   `-- icons.svg
|-- src
|   |-- assets
|   |-- components
|   |-- mocks
|   |-- pages
|   |-- routes
|   |-- services
|   |-- types
|   |-- App.css
|   |-- App.tsx
|   |-- index.css
|   `-- main.tsx
|-- DESIGN.md
|-- eslint.config.js
|-- package.json
|-- tailwind.config.js
|-- tsconfig.json
`-- vite.config.ts
```

---

# Application Routes

| Route | Screen | Description |
| --- | --- | --- |
| `/` | Landing Page | Hero, trending races, top jockeys, champion horses |
| `/schedule` | Schedule Page | Upcoming race schedule and race metadata |
| `/results` | Results Page | Recent race results and ranking tables |
| `/login` | Auth Page | Login and account creation interface |

---

# Getting Started

## Prerequisites

* Node.js
* npm

---

## Installation

```bash
npm install
```

---

## Development Server

```bash
npm run dev
```

The application will run on the local Vite development server, usually:

```text
http://localhost:5173
```

---

## Production Build

```bash
npm run build
```

---

## Preview Build

```bash
npm run preview
```

---

## Lint

```bash
npm run lint
```

---

# Design Direction

The visual direction follows the **Equine Precision** design system.

It combines:

* Premium sports branding
* Minimalist dashboard composition
* High readability for racing data
* Emerald green highlights for calls to action and live states
* Dark navy/black primary surfaces for authority and contrast
* Subtle gold accents for trophies, premium states, and rankings

---

# Current Project Status

| Feature | Status |
| --- | --- |
| Vite + React setup | Completed |
| TypeScript configuration | Completed |
| Tailwind design tokens | Completed |
| Routing setup | Completed |
| Landing page UI | Completed |
| Schedule page UI | Completed |
| Results page UI | Completed |
| Login/sign-up UI | Completed |
| API service integration | Planned |
| Real authentication | Planned |
| Role-based dashboards | Planned |
| Tournament management screens | Planned |
| Betting workflow integration | Planned |
| Automated tests | Planned |

---

# Future Improvements

Planned enhancements include:

* Connect schedule, result, horse, jockey, and user data to backend APIs
* Move mock data into dedicated `src/mocks` files
* Add typed API models in `src/types`
* Implement services in `src/services` using `axios`
* Add real login, sign-up, token storage, and protected routes
* Add admin, horse owner, jockey, referee, and spectator dashboards
* Build tournament creation and race registration screens
* Add race detail pages and horse/jockey profile pages
* Add loading, empty, and error states for API-driven screens
* Add unit and integration tests for critical UI flows

---

# Documentation Included

The repository currently includes:

* Frontend source code
* Design system document
* Tailwind theme configuration
* Route configuration
* Mock UI data inside components
* Project README

---

# Academic Purpose

This project can be used as part of a Software Engineering or web application capstone project to demonstrate:

* Frontend application architecture
* React component composition
* Routing and page layout
* Responsive UI development
* Sports tournament interface design
* Preparation for enterprise backend integration
