# Ice Breaker

## Project Overview

**Ice Breaker** is a location-based educational game platform designed to help students connect with their classmates while learning course material. The platform allows teachers to create interactive games based on their course content, which students can then play together at approved locations across campus.

The goal of **Ice Breaker** is to make learning more social and engaging while giving students a natural way to interact with people around them. Teachers can create and manage games through a simple game-building interface, while administrators have moderation tools to help ensure that the platform remains safe, appropriate, and accessible for everyone.

## Product Vision

> **For** students, teachers, and administrators who want a safe and engaging way for classmates to connect and learn together, **Ice Breaker** is a location-based educational game platform that allows teachers to turn course content into games that students can play together at approved locations across campus. **Unlike** generic quiz tools and apps, our product combines peer connection with course review, provides teachers with a simple game-building interface, and gives administrators moderation tools to help keep the experience safe, appropriate, and accessible to everyone.

## Key Features

* 📍 **Location-Based Gameplay** — Connect students at approved locations across campus.
* 🎮 **Interactive Games** — Students play games together while reviewing course material.
* 👩‍🏫 **Teacher Game Builder** — Teachers can create games using their own course content.
* 🛡️ **Administrator Moderation** — Administrators can monitor and manage content to maintain a safe environment.
* 🤝 **Peer Connection** — Encourage students to meet and interact with their classmates through gameplay.

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
| `inviteCode` | string | Code other users enter to join (see #31) |
| `createdAt` | timestamp | When it was created |

### `organizations/{orgId}/members/{uid}`

A subcollection inside each organization. The document ID is the member's `uid`.

| Field | Type | Description |
|---|---|---|
| `uid` | string | The member's `uid` (same as the document ID) |
| `role` | string | `"admin"` or `"member"` |
| `displayName` | string | Copy of the user's `displayName`. Firestore has no joins, so we store it here to avoid an extra lookup. |
| `joinedAt` | timestamp | When they joined |

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
* **`organizations/{orgId}/members/{uid}`**: a user can **create** only their own member doc, with role `"admin"`, in an organization they created. It uses `getAfter()` so it works in the same batch that creates the organization (#30).

**Still blocked. Add rules as part of these issues:**

* Editing organizations, e.g. regenerating the invite code (#31)
* Joining as a `"member"`, reading, and deleting `organizations/{orgId}/members` (#32, #33, #34)
* `reports` (#35)

If you change the rules, update this section too, so it matches what's published in the console.
