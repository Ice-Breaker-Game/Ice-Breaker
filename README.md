# Ice Breaker

## Project Overview

**Ice Breaker** is a location-based game platform that helps people in the same community meet and connect. Any organization can use it: schools, libraries, clubs, workplaces, community centers and more. Organizers create interactive games with their own content, and members play them together in person at approved locations.

The goal of **Ice Breaker** is to give people a fun, natural way to interact with the people around them. Organizers create and manage games through a simple game-building interface, and they have moderation tools to keep their organization safe, appropriate and accessible for everyone.

## Product Vision

> **For** organizations and their members who want a safe and engaging way for people to meet and connect, **Ice Breaker** is a location-based game platform that lets organizers turn their own content into games that members play together at approved locations. **Unlike** generic quiz and trivia apps, our product combines in-person connection with gameplay, gives organizers a simple game-building interface, and gives them moderation tools to keep the experience safe, appropriate and accessible to everyone.

## Who It's For

Organizations of any kind. For example:

* **Schools**: classmates review course material together.
* **Libraries**: patrons meet at events, book clubs or programs.
* **Clubs and community groups**: new members get to know each other.
* **Workplaces**: coworkers connect during onboarding or team events.

Each organization has **admins** (the organizers who create games and moderate) and **members** (the people who join with an invite code and play).

## Key Features

* 📍 **Location-Based Gameplay**: connects members at approved locations, like a classroom, library branch or event space.
* 🎮 **Interactive Games**: members play games together in person.
* 🛠️ **Game Builder**: organizers create games with their own content.
* 🛡️ **Moderation**: organization admins can manage members and review reports to keep everyone safe.
* 🤝 **Peer Connection**: helps people meet and interact with others in their community through gameplay.

## Getting Started

Ice Breaker is a React Native app built with [Expo](https://expo.dev). It runs in the browser and on iOS/Android from the same code.

### Prerequisites

* **Node 24** — the repo has an `.nvmrc`, so with [nvm](https://github.com/nvm-sh/nvm) just run `nvm use` in the project folder.
* **Expo Go** on your phone (App Store / Google Play) and a free [Expo account](https://expo.dev/signup).

### Setup

1. Install dependencies:
   ```sh
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in the Firebase values. You can find them in the Firebase console under **Settings → General → Your apps**. Ask a teammate to add you to the Firebase project if you don't have access. **Never commit `.env`.**
3. Log in to Expo (one time). The browser option works if you signed up with GitHub:
   ```sh
   npx expo login --browser
   ```
4. Start the app:
   ```sh
   npx expo start
   ```
   * Press `w` to open it in the browser.
   * Scan the QR code to open it in Expo Go. Your phone must be signed in to the same Expo account. If it can't connect (common on campus Wi-Fi), use `npx expo start --tunnel`.

Having trouble, or want to confirm everything works? See the [setup checklist and troubleshooting guide](docs/SETUP.md).

### Adding packages

Use `npx expo install <package>` instead of `npm install`. It picks versions that are compatible with our Expo SDK.

## Theme

The app uses one shared teal-and-icy look (#64). **Don't hardcode colors.** Import them from `src/theme.ts`, and use the shared components in `src/components/` instead of building your own buttons and inputs:

```tsx
import { Avatar, Button, Card, Screen, StatusMessage, TextField } from "@/components";
import { colors, fontSize, radius, spacing } from "@/theme";
```

| Color | Value | Used for |
|---|---|---|
| `colors.primary` | `#0e7490` | Buttons, links, active states |
| `colors.primaryDark` | `#155e75` | Headings, the header bar |
| `colors.primaryLight` | `#e0f2f7` | Selected rows, chips, tints |
| `colors.background` | `#f0f7fa` | Screen background |
| `colors.card` | `#ffffff` | Cards, inputs |
| `colors.border` | `#cbd5e1` | Input borders, dividers |
| `colors.text` / `colors.textMuted` | `#0f172a` / `#64748b` | Main text / labels, hints, dates |
| `colors.placeholder` | `#94a3b8` | Placeholder text in inputs |
| `colors.danger` / `colors.success` | `#dc2626` / `#16a34a` | Errors, Remove, Block, Report / success messages |

| Component | What it's for |
|---|---|
| `<Screen>` | Every screen's background, padding and max width. `centered` for short forms, `scroll={false}` when the screen has its own `FlatList`, `safeArea` for screens without a header. |
| `<Card>` | White rounded panel with a soft shadow. |
| `<Button title="..." />` | `variant="primary"` (filled), `"outline"`, or `"danger"` (red outline). `size="sm"` for list rows. `loading` shows a spinner and disables it. Works inside `<Link asChild>`. |
| `<TextField label="..." />` | Labeled text input with a teal focus border. Takes all normal `TextInput` props. |
| `<StatusMessage type="error" message={error} />` | Tinted error / success / info message. Shows nothing when `message` is empty. |
| `<Avatar name="..." photoURL={...} />` | Round profile picture, or initials if there isn't one. |
| `<AuthHeader title="..." subtitle="..." />` | App name and title at the top of the logged-out screens. |

## Firebase

We use the Firebase JS SDK with these services enabled:

| Service | Status |
|---|---|
| Authentication (Email/Password) | ✅ Enabled |
| Cloud Firestore | ✅ Enabled |
| Storage | ❌ Not enabled. It requires the paid Blaze plan. Profile pictures (#29) are shrunk to 256px JPEGs and saved in Firestore instead (see `photoURL` below). |

Firebase is set up once in `src/firebase.js`. Import from there instead of calling `initializeApp` yourself:

```js
import { auth, db } from "@/firebase"; // @/ means the src/ folder
```

`auth` keeps users logged in on both web (browser storage) and phones (AsyncStorage).

## Database Schema (Firestore)

Firestore creates a collection automatically when the first document is saved to it. For all `createdAt` / `joinedAt` fields, use `serverTimestamp()` from `firebase/firestore`, not the device's clock.

### `users/{uid}`

One document per user. The document ID is the user's Firebase Auth `uid`.

| Field | Type | Description |
|---|---|---|
| `displayName` | string | Name shown to other users |
| `email` | string | Login email |
| `photoURL` | string \| null | Profile picture as a data URL (`data:image/jpeg;base64,...`), shrunk so its longest side is 256px (about 20–40 KB). Works anywhere an image URL does. `null` until the user sets one. |
| `blockedUserIds` | array of strings | `uid`s this user has blocked. Starts as `[]`. Matching must skip these users (see **Blocking** below). |
| `blockedUserNames` | map | `{ [uid]: displayName }` for each blocked user, saved when blocking (#35). Other users' docs are private, so this is how the Profile screen shows who you've blocked. Missing on users who never blocked anyone. |
| `createdAt` | timestamp | When the account was created |

### `organizations/{orgId}`

The document ID is generated automatically by Firestore.

| Field | Type | Description |
|---|---|---|
| `name` | string | Organization name |
| `createdBy` | string | `uid` of the user who created it |
| `createdAt` | timestamp | When it was created |

The invite code is **not** stored here, because any signed-in user can read organization docs. It lives in `private/invite` (admins only) and `inviteCodes/{code}` (lookup for joining).

### `organizations/{orgId}/members/{uid}`

A subcollection inside each organization. The document ID is the member's `uid`.

| Field | Type | Description |
|---|---|---|
| `uid` | string | The member's `uid` (same as the document ID) |
| `role` | string | `"admin"` or `"member"` |
| `displayName` | string | Copy of the user's `displayName`. Firestore has no joins, so we store it here to avoid an extra lookup. When the user changes their name on the Profile screen, every copy is updated in the same batch (#29). |
| `inviteCode` | string | Only on members who joined with a code (#32). The code they used. The security rules check it against `inviteCodes/{code}` to prove the code is real. |
| `joinedAt` | timestamp | When they joined |

### `organizations/{orgId}/private/invite`

A single document that only the organization's admins can read. It holds the current invite code so the admin can see and share it.

| Field | Type | Description |
|---|---|---|
| `code` | string | The organization's current invite code |

### `inviteCodes/{code}`

One document per active invite code. The document ID **is** the code (6 characters, uppercase letters and numbers, without O, 0, I or 1). Joining (#32) looks up a code here to find its organization. Because the code is the document ID, two organizations can never have the same code.

| Field | Type | Description |
|---|---|---|
| `orgId` | string | The organization this code joins |
| `createdAt` | timestamp | When the code was created |

When an admin regenerates the code, the old `inviteCodes/{code}` doc is deleted, so the old code stops working.

### `organizations/{orgId}/reports/{reportId}`

A subcollection inside each organization, so only that organization's admins can read its reports (#35). The document ID is generated automatically by Firestore.

| Field | Type | Description |
|---|---|---|
| `reporterId` | string | `uid` of the user making the report |
| `reportedId` | string | `uid` of the user being reported |
| `reason` | string | One of: Harassment or bullying, Hate speech, Inappropriate content, Spam, Other |
| `details` | string | Optional extra text from the reporter (500 characters max). `""` if left empty. |
| `status` | string | `"open"`, or `"resolved"` after an admin marks it resolved |
| `createdAt` | timestamp | When the report was made |
| `resolvedBy` | string | `uid` of the admin who resolved it. Only on resolved reports. |
| `resolvedAt` | timestamp | When it was resolved. Only on resolved reports. |

## Security Rules

Rules are managed in the Firebase console (**Firestore Database → Rules**). Anything that doesn't have a rule is **blocked**, and rules do **not** carry down into subcollections.

Current rules:

* **`users/{uid}`**: a signed-in user can read and write **only their own** document.
* **`organizations/{orgId}`**: any signed-in user can **read**. A signed-in user can **create** one with themselves as `createdBy` and a name that isn't empty (50 characters max).
* **`organizations/{orgId}/members/{uid}`**: a user can **read only their own** member doc (to check their role). A user can **create** only their own member doc, in one of two ways:
  * as `"admin"` in an organization they created. It uses `getAfter()` so it works in the same batch that creates the organization (#30).
  * as `"member"` with an `inviteCode` whose `inviteCodes/{code}` doc points to this organization (#32).

  The only update allowed is a user changing the `displayName` copy on their **own** member docs (#29). Nothing else can be updated, so nobody can join twice or change their own role.

  **Every member** of the organization can **read all** its member docs, so they can see who's in it and open each other's profiles (#35). **Admins** can **delete** any member doc **except their own** (#34).
* **`{path=**}/members/{memberId}`** (collection group): a user can **read their own** member docs across **all** organizations. This is what lets the Organizations screen find every organization the user belongs to with one `collectionGroup(db, "members")` query (#33).
* **`organizations/{orgId}/private/{docId}`**: only admins of that organization can **read**, **create** and **update** (#31).
* **`organizations/{orgId}/reports/{reportId}`**: any **member** can **create** a report about another member of the same organization (not themselves), with `status: "open"` and only the fields listed in the schema. Only **admins** can **read** reports, and they can **update** one only to mark it `"resolved"` with `resolvedBy` and `resolvedAt` (#35).
* **`inviteCodes/{code}`**: any signed-in user can **look up one code** (`get`), but can't list them all. Only admins of the code's organization can **create** or **delete** it. There's no update rule, so an existing code can never be taken over (#31).

The rules use three helper functions: `isMember(orgId)` checks that the user's member doc exists, `isAdmin(orgId)` checks its role with `get()`, and `isAdminAfter(orgId)` checks it with `getAfter()` for batches that create the member doc at the same time.

Everything else is blocked. Add a rule when a new feature needs it.

If you change the rules, update this section too, so it matches what's published in the console.

### Indexes

* **`members` collection group, field `uid`**: needed for the `collectionGroup(db, "members")` query on the Organizations screen (#33). Firestore → **Indexes → Single field → Add exemption**, collection ID `members`, field `uid`, with **Collection group** scope enabled for Ascending.

## Blocking

Users block each other from another member's profile (`/organization/{orgId}/member/{uid}`) and unblock from their own Profile (#35). Blocked `uid`s are saved in the blocker's `users/{uid}.blockedUserIds`.

**Matching must skip any pair where either user has blocked the other.** One catch for whoever builds matching: `users/{uid}` docs are private, so a user's app can only read **its own** blocked list. It can't see whether the other person blocked them. Matching code needs a way to check both directions, for example a rule that lets matching read `blockedUserIds`, or saving blocks somewhere both users' apps can check.

## Active Organization (`useOrg`)

Most features (matches, games, reports) happen inside one organization. The user picks it on the **Organizations** screen (`/organizations`), and any screen can read it:

```tsx
import { useOrg } from "@/context/OrgContext";

const { activeOrgId, setActiveOrgId, loading } = useOrg();
```

* `activeOrgId` is `null` until the user picks one. Show a prompt to pick or join an organization in that case.
* `loading` is `true` for a moment while the saved choice is read from storage.
* The choice is saved with AsyncStorage per user (`activeOrgId-{uid}`), so it stays after restarting the app, and switching accounts on the same device doesn't mix them up.
* `OrgProvider` wraps every logged-in screen in `src/app/(logged-in)/_layout.tsx`, so `useOrg()` only works in logged-in screens.
