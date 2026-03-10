# MediRemind

> **Project:** MediRemind · Cloud Medication Manager  
> **Stack:** HTML · Tailwind CSS · Vanilla JavaScript · Supabase  
> **Version:** 4.0.0  
> **Last Updated:** March 10, 2026

---

MediRemind is a single-page, cloud-backed medication management and reminder system. Users can track their medication schedules, log adherence, set reminders with email/SMS notifications, view analytics, and export reports — all from a responsive Spotify-inspired dashboard. Built as an academic cloud computing project using a Supabase backend with a fully in-browser frontend.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup & Configuration](#setup--configuration)
- [Features](#features)
  - [Splash Screen & Authentication](#splash-screen--authentication)
  - [Dashboard Layout](#dashboard-layout)
  - [Medication Management](#medication-management)
  - [Archived Medications](#archived-medications)
  - [Reminder System](#reminder-system)
  - [Reports & Analytics](#reports--analytics)
  - [Profile Management & Settings](#profile-management--settings)
  - [Help & Support](#help--support)
  - [Dark Theme](#dark-theme)
  - [Toast Notification System](#toast-notification-system)
  - [Modal & Dialog System](#modal--dialog-system)
- [Design System](#design-system)
- [Script Load Order](#script-load-order)
- [CDN Dependencies](#cdn-dependencies)
- [Integrity & Audit](#integrity--audit)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Markup | HTML5 |
| Styling | Tailwind CSS (CDN build), custom CSS (`css/style.css`) |
| Logic | Vanilla JavaScript (ES6+) |
| Backend / Auth | Supabase JS SDK v2 |
| Charts | Chart.js 4.4 |
| PDF Export | jsPDF 2.5.1 + jsPDF-AutoTable 3.5.31 |
| Icons | Font Awesome 6.4 |

---

## Project Structure

```
MediRemind/
├── index.html              # Single-page app entry point
├── CHANGELOG.md            # Full development history
├── assets/
│   └── logo/               # App logo (used as favicon)
├── components/
│   └── stat-card.html      # Reusable stat card template
├── css/
│   └── style.css           # Custom design system & dark theme
└── js/
    ├── notifications.js    # Toast notification system
    ├── modal.js            # Reusable modal & dialog system
    ├── utils.js            # Shared utilities
    ├── loader.js           # Module loader / initialisation
    ├── mock-data.js        # In-memory data layer (medications, reminders, history)
    ├── reminders.js        # Reminder CRUD & upcoming reminders UI
    ├── medication-form.js  # Add/Edit medication modal form
    ├── medications.js      # Medication list, status, archive, delete
    ├── export.js           # CSV & PDF export
    ├── reports.js          # Reports & analytics panel
    ├── profile.js          # Profile management & settings
    ├── help.js             # Help & FAQ panel
    └── auth.js             # Supabase authentication
```

---

## Setup & Configuration

1. Clone or download the repository.
2. Open `index.html` in a browser directly — no build step is required.
3. To connect a real Supabase project, replace the `supabaseUrl` and `supabaseAnonKey` values at the bottom of `index.html` with your own project credentials.
4. Ensure your Supabase project has a `profiles` table with columns: `id` (uuid, FK to `auth.users`), `full_name` (text), `phone` (text), `timezone` (text).
5. If Supabase is unavailable, the app falls back to a fully functional offline/demo mode using in-memory data (`window.mockMedications`, `window.reminderDB`, `window.historyDB`).

---

## Features

### Splash Screen & Authentication

- Full-screen animated splash overlay (`#splash-screen`) with pill icon, title reveal, and pulsing dots (2 s duration); replays on logout for a clean transition back to the landing page.
- Supabase-powered **Sign In** (`signInWithPassword`), **Sign Up** (`signUp` with metadata + `profiles` table insert), and **Logout** (`signOut`).
- Auto-session restoration on page load via `getSession()`.
- Comprehensive logout cleanup — closes all overlay panels, clears the reminder auto-refresh interval, and re-injects the splash screen.

#### Terms and Conditions on Registration

- The account creation form requires explicit acceptance of the **Terms and Conditions** before submission is enabled.
- A clickable link within the form opens a scrollable **Terms and Conditions modal** (`window.showTermsModal()`) covering: acceptance of terms, service description, user responsibilities, medical disclaimer, data privacy, limitation of liability, account termination, and an academic use notice.
- The **Create Account** button remains disabled until the checkbox is ticked, enforced both in the UI (`updateSignupBtn()`) and server-side in `js/auth.js` (`window.signup()`).

---

### Dashboard Layout

- Spotify-inspired sidebar with sticky navigation: **Add Medication**, **Upcoming Reminders**, **Archived**, **Reports**, **Profile & Settings**, **Help & Support**, and the **Dark Mode** toggle.
- Mobile-responsive: sidebar slides in/out via a hamburger button backed by a backdrop overlay.
- User info footer in the sidebar shows the avatar initial, name, plan label, and a Logout button.
- Staggered module initialisation in `initDashboard()` using `setTimeout` offsets (100–300 ms) to ensure ordered startup.
- Debug utility (`testAllSystems()`) to verify all JS modules are loaded.

---

### Medication Management

- In-memory CRUD data layer (`window.medicationDB`) with auto-incremented IDs, deep-copy reads, and human-readable `lastTaken` timestamps.
- **Newly added medications appear at the top of the list.** `getAll()` sorts by `createdAt` descending, and `add()` stamps each new record with a UTC ISO timestamp, so the most recently added medication is always displayed first.
- Two seed medications (Metformin 500 mg daily, Lisinopril 10 mg daily) provided for demonstration.
- Add / Edit medication modal with field validation (name, dosage, time required), loading spinner on save, and dynamic header switching between Add and Edit modes.
- Each medication card displays: name, dosage, frequency, scheduled time, last-taken, notes, a colour-coded **clickable status badge** (cycles `pending → taken → missed`), and action buttons — **Set Reminder** (bell), **Edit** (pencil), **Archive** (box), and **Delete** (trash).
- Stats grid: Total Medications, Due Today, Adherence Rate (colour-coded progress bar: green ≥ 80%, yellow ≥ 50%, red < 50%), and Active Reminders.
- Empty-state UI with an Add Medication call-to-action when no medications exist.
- Status changes are live-synced to the history timeline and analytics chart.

---

### Archived Medications

- Medications that have completed their schedule can be **archived** rather than permanently deleted, preserving a full historical record.
- An **Archive** button (box icon) is available on every active medication card. Clicking it opens a confirmation dialog before moving the record.
- Archived records are moved from `window.mockMedications` into `window.archivedMedications` via `window.medicationDB.archive(id)`, stamped with an `archivedAt` UTC timestamp and a reason of `'completed'`.
- The **Archived** sidebar nav item (`window.archivedView.open()`) opens a full-screen overlay panel listing all archived medications.
- Archived cards are **read-only** — they display the medication name, dosage, frequency, scheduled time, last-taken date, archive date, and any notes, but provide no edit, delete, or status-toggle controls.
- The panel is fully integrated with the dark theme.

---

### Reminder System

- In-memory reminder data layer (`window.reminderDB`) with full CRUD, snooze (configurable minutes), dismiss, and reactivate operations.
- `getUpcoming()` auto-expires stale snoozes back to active and sorts by next occurrence time.
- Reminder form modal with medication dropdown (pre-selectable from the medication card bell button), time picker, frequency selector, Email/SMS notification checkboxes with visual highlight toggle, and a notes field.
- Deduplication check prevents duplicate reminders for the same medication, time, and notification type.
- Upcoming Reminders overlay with per-card display: medication name/dosage, scheduled time, frequency chip, notification type badges, colour-coded time badge (Overdue / Snoozed with countdown / In Xm / In Xh Ym), and action row (Snooze options, Dismiss, Delete).
- 60-second auto-refresh interval for live time-badge updates; interval cleaned up on logout.
- Two seed reminders linked to the default medications.

---

### Reports & Analytics

- 30 days of deterministic mock adherence history generated via a seeded pseudo-random function (`Math.sin`-based) for stable data across page loads.
- In-memory history data layer (`window.historyDB`) with date and medication filtering, plus live upsert on status toggle.
- Full-screen Reports panel with three tabs:
  - **Adherence:** Chart.js 4.4 grouped bar chart (Taken / Skipped / Missed) with switchable periods (Daily 7 d, Weekly 4 w, Monthly 3 m), per-column adherence tooltip, and four summary metric cards.
  - **History:** Date-grouped timeline with sticky headers (Today / Yesterday / full date), per-day taken/total badge, per-entry rows with status dot, medication info, scheduled and actual times, and status pill. Filterable by medication and status.
  - **Export:** CSV export (RFC-4180 compliant) and PDF export (jsPDF with branded purple header, summary table, per-medication breakdown, full history with auto-pagination). Graceful fallback when CDN libraries are unavailable.

---

### Profile Management & Settings

- Full-screen Profile panel with two tabs:
  - **Profile:** Avatar circle with initial, name, email, member-since date; editable Full Name, Email, and Phone with Supabase persistence (falls back gracefully in demo mode); password change with minimum-length and confirmation validation; Danger Zone with Sign Out.
  - **Settings:** Email/SMS notification channel toggles, default reminder time and frequency pickers, advanced preferences (advance notice 0–30 min, snooze duration 5–60 min, auto-mark as missed toggle), Reset to Defaults with confirmation.
- All settings persisted to `localStorage` under `mediremind_settings` and merged with defaults on load.
- Auto-save on every setting change with a "✓ Preferences saved" flash indicator.

---

### Help & Support

- Full-screen Help panel with: Getting Started guide (5 colour-coded step cards), FAQ accordion (10 items with toggle/chevron animation), Contact & Support card grid (Email, Documentation, GitHub), and app version footer (v4.0.0).

---

### Dark Theme

- A fully integrated dark theme is available across the entire application, toggled from the sidebar via the **Dark Mode / Light Mode** button (`window.toggleDarkTheme()`).
- The theme is applied by toggling the `dark-theme` class on `<html>`, which overrides all CSS custom properties with a deep, high-contrast dark palette.
- Theme preference is persisted in `localStorage` under `mediremind_dark_theme` and restored automatically on page load.
- Coverage includes: sidebar, main content area, medication cards, archived panel, modals, toast notifications, Reports panel, Profile panel, Help panel, splash screen, scrollbars, buttons, and ambient background glow.
- The toggle icon and label swap between a moon icon (Dark Mode) and a sun icon (Light Mode) to reflect the active state.

---

### Toast Notification System

- Fixed-position toasts (top-right) with type-specific colours and icons: success (green), error (red), info (blue), warning (yellow).
- Slide-in/out animation with auto-dismiss timers (3–5 s depending on type).
- Global `window.notify` wrapper with `.success()`, `.error()`, `.info()`, `.warning()`, and `.show()` methods.

---

### Modal & Dialog System

- Reusable `ModalSystem` class injecting `#modal-backdrop` and `#modal-container` into the DOM.
- Supports sizes `sm / md / lg / xl / full`, optional title bar, closable flag, backdrop-click and Escape-key dismissal.
- Animate-in (scale + opacity) and animate-out with 300 ms transitions.
- Confirmation dialog with stored callback pattern (`_pendingConfirm` / `_runConfirm`), dynamic icon (warning triangle for destructive actions, question mark otherwise), and customisable button text and colour classes.

---

## Design System

Defined in `css/style.css`:

- **Colour tokens** — pastel CSS custom properties: Light Blue (`#A8D8EA`), Sage Green (`#B2C9AD`), Muted Yellow (`#F5E6A3`) with light, base, and dark variants for each; plus surface, border, and text tokens for consistent theming.
- **Components** — `.mr-card`, `.mr-btn` variants (primary, green, yellow, ghost, outline), `.status-badge` variants, `.medication-card`, `.notification-toast`, `.export-card`, `.faq-item`.
- **Animations** — `fadeIn`, `fadeInScale`, `slideInRight`, `slideOutRight`, `spin`, `pulse-glow`, `pulse`, `float`, `ambientGlow`, `splashLogoIn`, `splashTextIn`, `splashDotPulse`.
- **Ambient background** — `body::before` pseudo-element with animated radial gradients (subtly adjusted in dark mode).
- **Responsive breakpoints** — 768 px (sidebar off-screen, modal max-height reduced, full-width notifications), 640 px (tab icons hidden, reduced padding, shorter scroll containers).
- **Custom scrollbar** — 8 px, rounded thumb; overridden in dark mode to `#3a3f50 / #50566a`.
- **Dark theme** — See [Dark Theme](#dark-theme) above.

---

## Script Load Order

Script loading order in `index.html` is critical to dependency resolution:

```
notifications.js → modal.js → utils.js → loader.js → mock-data.js
→ reminders.js → medication-form.js → medications.js
→ export.js → reports.js → profile.js → help.js → auth.js
```

`auth.js` is loaded last because it depends on all other modules being initialised.

---

## CDN Dependencies

| Library | Version | Purpose |
|---|---|---|
| Tailwind CSS | CDN build | Utility-first styling |
| Font Awesome | 6.4 | Icon set |
| Chart.js | 4.4 | Adherence bar charts |
| jsPDF | 2.5.1 | PDF generation |
| jsPDF-AutoTable | 3.5.31 | PDF table layout |
| Supabase JS | v2 | Auth & database client |

All CDN libraries have graceful fallbacks if unavailable.

---

## Integrity & Audit

A full dependency and file relationship audit was performed on March 10, 2026. All issues identified — including cross-module dependency ordering, data layer consistency, UI state cleanup on logout, and modal callback correctness — were resolved. The project is in a stable, production-representative state for academic review.

---

> **Disclaimer:** MediRemind is an academic project developed for a Cloud Computing course. It is not intended for real medical use. Always follow the advice of a qualified healthcare professional regarding your medications.
