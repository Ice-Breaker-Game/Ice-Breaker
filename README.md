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

## Firebase

We use the Firebase JS SDK with these services enabled:

| Service | Status |
|---|---|
| Authentication (Email/Password) | ✅ Enabled |
| Cloud Firestore | ✅ Enabled |
| Storage | ❌ Not enabled. It requires the paid Blaze plan. Profile pictures (#29) will use a free image service instead and save the image URL in `photoURL`. |

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
| `photoURL` | string \| null | Profile picture URL. `null` until the user sets one. |
| `blockedUserIds` | array of strings | `uid`s this user has blocked. Starts as `[]`. |
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
| `displayName` | string | Copy of the user's `displayName`. Firestore has no joins, so we store it here to avoid an extra lookup. |
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

### `reports/{reportId}`

The document ID is generated automatically by Firestore.

| Field | Type | Description |
|---|---|---|
| `reporterId` | string | `uid` of the user making the report |
| `reportedId` | string | `uid` of the user being reported |
| `orgId` | string | Organization the report belongs to |
| `reason` | string | Why the user is being reported |
| `status` | string | Starts as `"open"` |
| `createdAt` | timestamp | When the report was made |

## Security Rules

Rules are managed in the Firebase console (**Firestore Database → Rules**). Anything that doesn't have a rule is **blocked**, and rules do **not** carry down into subcollections.

Current rules:

* **`users/{uid}`**: a signed-in user can read and write **only their own** document.
* **`organizations/{orgId}`**: any signed-in user can **read**. A signed-in user can **create** one with themselves as `createdBy` and a name that isn't empty (50 characters max).
* **`organizations/{orgId}/members/{uid}`**: a user can **read only their own** member doc (to check their role). A user can **create** only their own member doc, in one of two ways:
  * as `"admin"` in an organization they created. It uses `getAfter()` so it works in the same batch that creates the organization (#30).
  * as `"member"` with an `inviteCode` whose `inviteCodes/{code}` doc points to this organization (#32).

  There's no update rule, so nobody can join twice or change their own role.
* **`organizations/{orgId}/private/{docId}`**: only admins of that organization can **read**, **create** and **update** (#31).
* **`inviteCodes/{code}`**: any signed-in user can **look up one code** (`get`), but can't list them all. Only admins of the code's organization can **create** or **delete** it. There's no update rule, so an existing code can never be taken over (#31).

The rules use two helper functions: `isAdmin(orgId)` checks the user's member doc with `get()`, and `isAdminAfter(orgId)` checks it with `getAfter()` for batches that create the member doc at the same time.

**Still blocked. Add rules as part of these issues:**

* Reading other members and deleting `organizations/{orgId}/members` (#33, #34)
* `reports` (#35)

If you change the rules, update this section too, so it matches what's published in the console.
