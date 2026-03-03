# MediRemind — Changelog

> **Project:** MediRemind · Cloud Medication Manager  
> **Stack:** HTML · Tailwind CSS · Vanilla JavaScript · Supabase  
> **Version:** 4.0.0  
> **Last Updated:** March 1, 2026

---

## Changes & Improvements

### Favicon Support · `index.html`
- Added a custom favicon using the project logo at `assets/logo/logo.png`.
- The `<link rel="icon">` tag uses `type="image/png"` to correctly match the PNG file format.
- The favicon is displayed on the browser tab across all views of the single-page application.

### Landing & Sign-In Page — Vertical Centering · `index.html`
- Restructured the pre-login layout so the landing hero and sign-in form are perfectly centered both horizontally and vertically within the viewport.
- Applied `flex flex-col` to the `<body>` element to establish a full-height flex column.
- Applied `flex-1 flex items-center justify-center` to the `#pre-login-main` container so it expands to fill all space between the header and footer and centers its children.
- Replaced fixed `py-12` padding on `#hero-section` with `w-full` to eliminate asymmetric spacing that pushed content upward.
- Added `w-full` to `#auth-forms` so the sign-in form fills available width within the centered container.
- The top navigation bar and footer remain unaffected.

### Splash Screen Animation · `index.html`, `css/style.css`
- Full-screen splash overlay (`#splash-screen`) with animated pill icon, title reveal, and pulsing loading dots.
- Plays on initial page load (2 s duration) and replays on logout for a polished transition.
- Keyframe animations: `splashLogoIn`, `splashTextIn`, `splashDotPulse`.

### Medication Management System · `js/mock-data.js`, `js/medication-form.js`, `js/medications.js`
- In-memory CRUD data layer (`window.medicationDB`) with auto-incremented IDs, deep-copy reads, and human-readable `lastTaken` timestamps.
- Two seed medications (Metformin 500 mg daily, Lisinopril 10 mg daily) for demonstration.
- Add / Edit medication modal form with field validation (name, dosage, time required), loading spinner on save, and dynamic header switching between Add and Edit modes.
- Medication card list with name, dosage, frequency, scheduled time, last-taken, notes, colour-coded status badge (clickable to cycle `pending → taken → missed`), Edit button, Delete button, and Set Reminder bell button.
- Stats grid showing Total Medications, Due Today, Adherence Rate (with colour-coded progress bar: green ≥ 80 %, yellow ≥ 50 %, red < 50 %), and Active Reminders.
- Empty-state UI with an Add Medication call-to-action when no medications exist.
- Legacy shims (`loadMockMedications`, `confirmDeleteMedication`) retained for backward compatibility.

### Modal & Dialog System · `js/modal.js`
- Reusable `ModalSystem` class injecting `#modal-backdrop` and `#modal-container` into the DOM.
- Supports sizes `sm / md / lg / xl / full`, optional title bar, closable flag, backdrop-click and Escape-key dismissal.
- Animate-in (scale + opacity) and animate-out with 300 ms transitions.
- Confirmation dialog with stored callback pattern (`_pendingConfirm` / `_runConfirm`), dynamic icon (warning triangle for destructive actions, question mark otherwise), and customisable button text and colour classes.

### Toast Notification System · `js/notifications.js`, `js/utils.js`
- Fixed-position toast notifications (top-right) with type-specific colours and icons — success (green), error (red), info (blue), warning (yellow).
- Slide-in/out animation with auto-dismiss timers (3–5 s depending on type).
- Convenience wrapper (`window.notify`) with `success()`, `error()`, `info()`, `warning()`, and `show()` methods.

### Reminder System · `js/reminders.js`, `js/mock-data.js`
- In-memory reminder data layer (`window.reminderDB`) with full CRUD, snooze (configurable minutes), dismiss, and reactivate operations.
- `getUpcoming()` query auto-expires stale snoozes back to active and sorts by next occurrence time.
- Reminder form modal with medication dropdown (pre-selectable from medication card bell button), time picker, frequency selector, Email / SMS notification type checkboxes with visual highlight toggle, and notes field.
- Deduplication check prevents creating duplicate reminders for the same medication, time, and notification type.
- Upcoming Reminders overlay with per-card display: medication name and dosage, scheduled time, frequency chip, notification type badges, colour-coded time badge (Overdue / Snoozed with countdown / In Xm / In Xh Ym), and action row (Snooze options, Dismiss, Delete).
- 60-second auto-refresh interval for live time-badge updates; interval cleaned up on logout.
- Two seed reminders linked to the default medications.

### Reports & Analytics · `js/reports.js`, `js/export.js`, `js/mock-data.js`
- 30 days of deterministic mock adherence history generated via a seeded pseudo-random function (`Math.sin`-based) ensuring stable data across page loads.
- In-memory history data layer (`window.historyDB`) with date and medication filtering, plus live upsert on status toggle.
- Full-screen Reports panel with three tabs — Adherence, History, and Export.
- **Adherence tab:** Grouped bar chart (Chart.js 4.4) with Taken / Skipped / Missed datasets; switchable periods (Daily 7 d, Weekly 4 w, Monthly 3 m); tooltip with per-column adherence percentage; four summary metric cards below the chart.
- **History tab:** Date-grouped timeline with sticky headers showing Today / Yesterday / full date and per-day taken/total badge; per-entry rows with status dot, medication info, scheduled and actual times, status pill; filterable by medication and status.
- **Export tab:** CSV export (RFC-4180 compliant, history or medications) and PDF export (jsPDF 2.5.1 + AutoTable) with branded purple header, overall summary table, per-medication breakdown, and full history with auto-pagination. Graceful fallback if CDN libraries are unavailable.
- Live sync — status toggles on medication cards instantly update the history timeline and chart data.

### Profile Management & Settings · `js/profile.js`
- Full-screen Profile panel with two tabs — Profile and Settings.
- **Profile tab:** Avatar circle with initial, name, email, member-since date; editable Full Name, Email, and Phone fields with Supabase persistence (falls back to demo/offline mode gracefully); password change with minimum-length and confirmation validation; Danger Zone with Sign Out.
- **Settings tab:** Email and SMS notification channel toggles; default reminder time and frequency pickers; advanced preferences (advance notice 0–30 min, snooze duration 5–60 min, auto-mark as missed toggle); Reset to Defaults with confirmation.
- All settings persisted to `localStorage` under `mediremind_settings` and merged with defaults on load.
- Auto-save on every setting change with a "✓ Preferences saved" flash indicator.

### Help & Support · `js/help.js`
- Full-screen Help panel with Getting Started guide (5 colour-coded step cards), FAQ accordion (10 items with toggle/chevron animation), Contact & Support card grid (Email, Documentation, GitHub), and app version footer (v4.0.0).

### Authentication · `js/auth.js`
- Supabase-powered login (`signInWithPassword`), signup (`signUp` with metadata + `profiles` table insert), and logout (`signOut`).
- Auto-session restoration on page load via `getSession()`.
- Comprehensive logout cleanup — closes modal, all overlay panels, clears reminder refresh interval, re-injects splash screen for animated transition back to the landing page.

### Dashboard Layout · `index.html`
- Spotify-inspired sidebar layout with sticky navigation (Add Medication, Upcoming Reminders, Reports, Profile & Settings, Help & Support) and user info footer with avatar, name, plan label, and Logout button.
- Mobile-responsive: sidebar slides in/out via hamburger button with backdrop overlay.
- Staggered module initialisation in `initDashboard()` using `setTimeout` offsets (100–300 ms) to ensure ordered startup.
- Debug utility (`testAllSystems()`) button to verify all JS modules are loaded.

### Design System · `css/style.css`
- Pastel colour palette via CSS custom properties — Light Blue (`#A8D8EA`), Sage Green (`#B2C9AD`), Muted Yellow (`#F5E6A3`) — with light and dark variants for each.
- Surface, border, and text tokens for consistent theming.
- Ambient glow background via `body::before` pseudo-element with animated radial gradients.
- Component styles: `.mr-card` (interactive hover lift + shadow), `.mr-btn` variants (primary, green, yellow, ghost, outline), `.status-badge` variants, `.medication-card`, `.notification-toast`, `.export-card`, `.faq-item`.
- Panel-specific styles for Reports (`#reports-panel`), Profile (`#profile-panel`), and Help (`#help-panel`) with tab button active/inactive states, period selector buttons, and scroll-constrained containers.
- Toggle switch styling via CSS sibling selectors (`sr-only:checked`).
- Keyframe animations: `fadeIn`, `fadeInScale`, `slideInRight`, `slideOutRight`, `spin`, `pulse-glow`, `pulse`, `float`, `ambientGlow`.
- Custom thin scrollbar styling (8 px, rounded thumb).
- Responsive breakpoints at 768 px (sidebar off-screen, modal max-height reduced, full-width notifications) and 640 px (tab icons hidden, reduced padding, shorter scroll containers).

### Script Load Order · `index.html`
- Critical dependency-ordered script loading established:
  ```
  notifications.js → modal.js → utils.js → loader.js → mock-data.js
  → reminders.js → medication-form.js → medications.js
  → export.js → reports.js → profile.js → help.js → auth.js
  ```

### CDN Dependencies · `index.html`
- Tailwind CSS (CDN build), Font Awesome 6.4, Chart.js 4.4, jsPDF 2.5.1, jsPDF-AutoTable 3.5.31, Supabase JS SDK v2.

### Reusable Stat Card Template · `components/stat-card.html`
- `<template id="stat-card-template">` with data attributes and a `window.renderStatCard(config)` helper function for cloning and configuring stat cards.

---

## Bug Fixes

### Favicon Not Displaying · `index.html`
- The `<link rel="icon">` tag originally pointed to a non-existent `assets/favicon.ico` file with MIME type `image/x-icon`.
- Updated the path to `assets/logo/logo.png` and the type to `image/png`, matching the actual file in the project.

### Landing & Sign-In Content Sitting Too High · `index.html`
- The pre-login main content area (`#pre-login-main`) lacked flex-grow behaviour, causing the hero section and sign-in form to sit near the top of the page instead of being vertically centered.
- Fixed by making the body a flex column and the main area a flex-growing centered container (`flex-1 flex items-center justify-center`).
- Removed `py-12` from `#hero-section` which added uneven top/bottom padding contributing to the off-center appearance.

### Modal Confirm Callback Corruption · `js/modal.js`
- The original `confirm()` method serialised the `onConfirm` callback via `.toString()` and rebuilt it with string `.replace()`, which silently corrupted any multi-line arrow function, causing confirm actions (e.g., medication delete) to fail or behave unpredictably.
- Replaced with a stored-reference pattern: the callback is saved as `this._pendingConfirm` and executed via `_runConfirm()` after the modal closes, eliminating all serialisation issues.

### Logout State Leaks · `js/auth.js`
- Logout previously did not close overlay panels (Reports, Profile, Help, Upcoming Reminders) or clear the reminder auto-refresh interval, which could leave stale state and timers running after signing out.
- Added comprehensive cleanup that closes all modals and panels, calls `reminders.cleanup()` to clear the interval, and re-injects the splash screen for a clean transition.

### Stale Snooze Status on Reminders · `js/reminders.js`
- `getUpcoming()` now automatically detects snoozed reminders whose `snoozeUntil` time has passed and reactivates them to `active` status, preventing permanently stuck "snoozed" badges.
