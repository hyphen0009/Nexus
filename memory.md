# Project Memory & Requirements

This document serves as a centralized memory for all core features, requirements, and design decisions for the **Game Tournament Registration Website**.

## 1. Core User Requirements

### Authentication
- Users must be able to **register** using their Email and Password.
- Users must be able to **login** using their Email.
- A **Forgot Password** flow must be available to reset passwords.

### Dashboard & Navigation
- The main screen must have a prominent **"Create Team"** button.
- A **Tournament Listing** view that displays upcoming and ongoing tournaments.

### Team Creation & Registration
- **Single-User Registration (Captain)**: One person is responsible for creating a team.
- **Member Details**: The person creating the team MUST manually enter the **Game Name** and **UID** for every member of their team during the creation process. There is no need for an invite system or for other team members to create individual platform accounts.

### Tournament Visibility
- Users must be able to click on a specific tournament and see exactly **which teams are registered** and view the individual **players/participants** for those teams.

### Admin Features
- An **Admin Page** must exist.
- Administrators can use this page to view all registered teams and see all detailed information (including all members' Game Names and UIDs) for every tournament.

---

## 2. Technical Stack & Architecture

- **Frontend & Framework**: Next.js (App Router).
- **Styling**: Custom Vanilla CSS (`globals.css`). The design avoids generic frameworks (like Tailwind) to ensure a highly customized, premium feel.
- **Design Aesthetic**: Premium "Dark Gamer" theme. Features include deep dark backgrounds (`#0B0F19`), glassmorphism panels, and vibrant neon accents (Electric Cyan, Neon Purple).
- **Database ORM**: Prisma. (Currently configured with SQLite for development, scalable to PostgreSQL).
- **Database Schema**: 
  - `User`: Handles authentication and admin roles.
  - `Team`: Stores the team name, game focus, and links to the creator.
  - `TeamMember`: Stores the individual Game Names and UIDs for roster members.
  - `Tournament`: Stores tournament details.
  - `TeamTournament`: Join table handling which teams are registered for which tournaments.

---

## 3. Completed Work Summary
- Initialized Next.js project and custom design system.
- Designed Authentication screens (`/login`, `/register`, `/forgot-password`).
- Designed the Main Dashboard (`/`).
- Designed the Team Creation form (`/teams/create`) capturing full rosters and UIDs.
- Designed the Team Directory (`/teams`) for browsing registered rosters and members.
- Designed the Team Detail view (`/teams/[id]`) for full roster and tournament history.
- Designed the Tournament Listing (`/tournaments`) and Tournament Detail view (`/tournaments/[id]`).
- Designed the secure Admin Dashboard (`/admin`).
