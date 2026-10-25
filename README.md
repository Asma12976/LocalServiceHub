# 🛠️ Local Service Hub

> **Find. Book. Get It Done.**

Local Service Hub is a cross-platform mobile app (Android & iOS) that connects people with trusted local service professionals — electricians, plumbers, AC technicians, mechanics, cleaners, carpenters and more. Customers can discover nearby providers, book a time slot, chat with them, and leave reviews. Providers get their own business dashboard, and an Admin Panel keeps the platform safe by moderating providers, disputes and reviews.

The app is built with **React Native (Expo)** and **Firebase**, and includes several **AI-powered features** (service assistant, price estimator, image problem analyzer, voice input and more).

---

## 📑 Table of Contents

1. [Highlights](#-highlights)
2. [User Roles](#-user-roles)
3. [Features](#-features)
4. [AI Features](#-ai-features)
5. [Tech Stack](#-tech-stack)
6. [Project Structure](#-project-structure)
7. [Data Model (Firestore)](#-data-model-firestore)
8. [Booking Lifecycle](#-booking-lifecycle)
9. [Smart Algorithms](#-smart-algorithms)
10. [Getting Started](#-getting-started)
11. [Environment Variables & Configuration](#-environment-variables--configuration)
12. [Known Limitations & Notes](#-known-limitations--notes)
13. [Roadmap](#-roadmap)

---

## ✨ Highlights

- 👥 **Three roles in one app** — Customer, Service Provider, and Admin
- 📅 **End-to-end booking flow** — service → date → time slot → address → problem description → optional photo → confirmation
- 🤖 **AI built in** — chat assistant, price estimator, photo-based problem analysis, description generator, voice-to-text
- 🚨 **Emergency Service mode** — instantly find the best available provider for urgent problems
- 📍 **Near Me radar** — live GPS-based radar view of providers around you (no native maps required)
- 💬 **Real-time chat & notifications** — powered by Firestore listeners
- 🛡️ **Admin moderation** — approve/suspend providers, resolve disputes, handle fake reviews
- 🌙 **Dark mode** that is persisted across restarts

---

## 👥 User Roles

| Role | What they can do |
|------|------------------|
| **Customer** | Browse categories, search & filter providers, view provider profiles, book services, chat, favorite providers, review completed jobs, raise disputes, use AI tools & emergency mode |
| **Service Provider** | Create/edit business profile, list services with prices, receive and manage booking requests, update job status, view earnings & reviews, chat with customers |
| **Admin** | Dashboard of platform health, approve/suspend/reactivate/remove/flag providers, resolve or dismiss disputes, hide/restore/flag reviews, message affected users |

Role is chosen at **Sign Up** (Customer / Provider) and stored in Firestore. Admin accounts are identified by `role: 'admin'` in Firestore and are routed to a completely separate Admin Panel right after login — a customer or provider can never reach it.

---

## 🚀 Features

### 🔐 Authentication & Account
- Email/password **Sign Up** and **Login** with Firebase Authentication
- **Sign in with Google** (requires a development build — see notes)
- **Forgot Password** (email reset) and **Change Password**
- Persistent login via AsyncStorage
- Form validation for name, email, phone, password strength and confirm password
- Splash screen with animated logo
- Edit profile with **profile photo upload** (Cloudinary)

### 🏠 Customer App

**Discovery**
- Home screen with categories, **personalized "Recommended For You"** row, and promo cards (AI Assistant, Emergency)
- **12 service categories**: Electrician, Plumber, Mechanic, AC Technician, Cleaning, Carpenter, Painter, Electronics, Home Appliances, Beauty & Salon, Computer Repair, Moving & Shifting
- Search bar with **category filter bottom-sheet**
- Categories / Explore screen with pre-filtered results
- **Provider details** page — services & prices, ratings, reviews, location, availability
- **Favorites** — save and revisit providers (synced to Firestore)
- **Near Me** — radar visualization + list view sorted by real distance

**Booking**
- Choose a service, then pick from the **next 14 days** and available **hourly time slots**
- Enter service address and describe the problem
- Attach an optional **problem photo**
- See an **AI price estimate** before confirming
- Booking confirmation screen, **My Bookings** list, and detailed booking view
- Cancel bookings, track live status updates from the provider

**After the job**
- Leave a **star rating + comment** for completed bookings (updates the provider's aggregate rating live)
- **Raise a dispute** with quick reasons (e.g. provider didn't show up, wrong amount charged) or a custom message

**Communication**
- **In-app chat** with providers (and with Admin during disputes)
- **Notifications** center with unread badges, plus local OS notifications
- Unread-message badges in the drawer

**Emergency Service**
- One-tap list of best-matched providers in urgency-prone categories
- **Match score %** shown for transparency, "Best Match Right Now" badge, and a **Call Now** button

**Other**
- **Help & Support** with expandable FAQs (booking, cancellation, becoming a provider, reviews, urgent help, payment)
- **Settings** — Dark Mode, Edit Profile, Change Password, Support
- Drawer navigation + custom bottom tab bar

### 🧰 Provider App
- **Business Profile Setup** — business name, category, bio, services & pricing, experience, location, availability, photos
- "Use my current location" to drop a real **GPS pin**
- **AI-generated service description** to write professional bios quickly
- **AI photo-quality check** for business photos
- **Provider Dashboard** — today's bookings, pending requests, total earnings (Rs.), quick actions
- **Booking Requests** — confirm, mark *On the Way*, *In Progress*, *Completed*
- Booking details with customer info
- **My Reviews** — see all customer feedback
- Chat with customers & receive in-app notifications
- New profiles start as **pending** until approved by an Admin

### 🛡️ Admin Panel
- **Dashboard** — pending providers, open disputes, flagged reviews, with shortcuts
- **Providers** — search, status filter (Pending / Approved / Suspended), approve, suspend (with reason), reactivate, remove listing, flag/unflag
- **Provider details** — full profile review before approving
- **Disputes** — grouped into *Open / Resolved / Dismissed*; resolving or dismissing writes back to the exact booking so the customer & provider see the update instantly
- **Reviews moderation** — *Flagged / All / Hidden* tabs to flag, hide (removes everywhere), restore or unflag reviews
- **Messages** — Admin can chat directly with providers/customers (e.g. notify about a suspension or a dispute outcome)
- Admin data listener only runs for real admin sessions (not for regular users)

---

## 🤖 AI Features

All AI logic lives in `src/services/aiService.js`.

| # | Feature | Powered by | Description |
|---|---------|------------|-------------|
| 1 | **AI Service Assistant** | Groq (LLM) | Customer describes a problem in plain language; the assistant replies conversationally and, once confident, suggests the right category with a button to jump to matching providers |
| 2 | **AI Price Estimator** | Groq (LLM) | Takes the base price, service, category and problem description and returns a low–high price range (multiplier-based, with a quick local fallback estimate) |
| 3 | **Service Description Generator** | Groq (LLM) | Helps providers write polished service descriptions |
| 4 | **Image Problem Analyzer** | Google Gemini (vision) | Analyzes an uploaded photo of the problem and identifies the issue and suitable category |
| 5 | **Photo Quality Analyzer** | Google Gemini (vision) | Checks provider photos for quality before upload |
| 6 | **Voice Input (Speech-to-Text)** | Groq Whisper (`whisper-large-v3-turbo`) | Record audio and transcribe it, with filtering of silence "hallucinations" |

> AI features degrade gracefully: if an API key is missing, the app shows a friendly message instead of crashing.

---

## 🧱 Tech Stack

### Frontend / Mobile
| Technology | Purpose |
|-----------|---------|
| **React Native** | Cross-platform mobile UI |
| **Expo (managed workflow)** | Tooling, build & native module access |
| **React Context API** | Global state (User, Bookings, Providers, Chat, Notifications, Favorites, Admin, Theme) |
| **React Navigation** (Native Stack, Bottom Tabs, Drawer) | Navigation |
| **@expo/vector-icons (Ionicons)** | Icons |
| **expo-linear-gradient** | Gradient UI elements |
| **react-native-safe-area-context** | Safe-area handling |

### Backend / Cloud
| Technology | Purpose |
|-----------|---------|
| **Firebase Authentication** | Email/password & Google sign-in |
| **Cloud Firestore** | Real-time database (users, providers, bookings, chats, notifications, favorites) |
| **Cloudinary** | Image hosting (profile, provider and problem photos — unsigned uploads) |

### AI & Services
| Technology | Purpose |
|-----------|---------|
| **Groq API** (`openai/gpt-oss-20b`) | Text chat, price estimation, description generation |
| **Groq Whisper** (`whisper-large-v3-turbo`) | Speech-to-text |
| **Google Gemini** | Image-based analysis |

### Device APIs (Expo modules)
`expo-location` · `expo-image-picker` · `expo-audio` · `expo-file-system` · `expo-notifications` (local) · `expo-auth-session` · `expo-web-browser` · `expo-constants` · `expo-status-bar` · `@react-native-async-storage/async-storage`

---

## 📂 Project Structure

```
src/
├── components/          # Reusable UI (SearchBar, ProviderCard, ChatBubble, DisputeModal, GradientButton, InputField, ...)
├── config/
│   ├── firebase.js      # Firebase app, Auth (AsyncStorage persistence), Firestore
│   └── googleAuth.js    # Google sign-in client IDs
├── context/             # Global state & Firestore logic
│   ├── UserContext.js          # Auth, profile, photo upload
│   ├── BookingsContext.js      # Bookings, reviews, disputes
│   ├── ProviderContext.js      # Provider profiles, live ratings, moderation actions
│   ├── ChatContext.js          # Conversations & messages
│   ├── NotificationContext.js  # In-app + local OS notifications
│   ├── FavoritesContext.js     # Saved providers
│   ├── AdminContext.js         # Disputes & review moderation
│   └── ThemeContext.js         # Light/Dark mode
├── data/
│   └── mockData.js      # Categories + sample providers
├── navigation/          # Auth, Customer (tabs + drawer), and Admin navigators
├── screens/
│   ├── admin/           # Dashboard, Providers, ProviderDetails, Disputes, Reviews, Messages, Chat
│   ├── customer/        # Home, Categories, NearMe, Booking flow, Chat, Favorites, Profile, Settings, AI Assistant, Emergency, ...
│   ├── provider/        # Dashboard, Profile Setup, Bookings, Reviews
│   └── (auth screens)   # Splash, Login, Signup, ForgotPassword, ChangePassword
├── services/
│   └── aiService.js     # All AI integrations (Groq + Gemini)
├── theme/
│   └── colors.js        # Light/dark palette, spacing, radius
└── utils/               # location, recommendation, validation, dateFormat, bookingStatus, notify, pushNotification, navigationRef
```

---

## 🗄️ Data Model (Firestore)

| Collection | Description |
|-----------|-------------|
| `users/{uid}` | Personal profile — name, email, phone, photo, **role** (`customer` / `provider` / `admin`) |
| `providers/{uid}` | Business profile — category, services, pricing, location, availability, `status` (`pending` / `approved` / `suspended`), `flagged`, rating & review count |
| `bookings/{id}` | Booking details, status, customer & provider info, **review** and **dispute** fields (no separate collections needed) |
| `favorites/{uid_providerId}` | One document per customer–provider favorite |
| `conversations/{id}` | Participants, last message, unread counts |
| `conversations/{id}/messages/{id}` | Individual chat messages |
| `notifications/{uid}/items/{id}` | Per-user notification feed |

---

## 🔄 Booking Lifecycle

```
Pending ──► Confirmed ──► On the Way ──► In Progress ──► Completed ──► Review / Dispute
   │
   └──────► Cancelled
```

- **Pending** — customer created the request
- **Confirmed** (`accepted`) — provider accepted it
- **On the Way / In Progress** — live job progress updates by the provider
- **Completed** — job done; customer can now review or raise a dispute
- **Cancelled** — cancelled by the customer

---

## 🧠 Smart Algorithms

### Personalized Recommendations (`utils/recommendation.js`)
"Recommended For You" ranks providers using a weighted score:

| Signal | Weight |
|-------|--------|
| Category affinity (your booking history + favorites) | 40% |
| Rating quality (Bayesian-adjusted, so 2 reviews can't beat 120) | 25% |
| Proximity (real GPS, haversine distance) | 20% |
| Availability | 10% |
| Already a favorite | 5% |

New users with no history get a neutral score and the section is honestly labeled *"Popular Near You"*.

### Emergency Match Score (`EmergencyServiceScreen`)
Providers get a 0–100 score: **Availability (55)**, **Rating (25)**, **Experience (10, capped at 10 yrs)**, plus a distance/response signal. Ties are broken by lowest starting price.

### Location (`utils/location.js`)
Real device GPS + haversine distance. A provider's position is resolved from: (1) their dropped GPS pin → (2) a match against the Islamabad sector typed in their location → (3) a deterministic fallback point.

---

## ⚙️ Getting Started

### Prerequisites
- **Node.js** 18+ and **npm** / **yarn**
- **Expo CLI** (`npx expo`)
- A **Firebase** project (Auth + Firestore enabled)
- A **Cloudinary** account (unsigned upload preset)
- API keys for **Groq** and **Google Gemini**
- Expo Go app *or* an Android/iOS emulator

### Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd <your-project-folder>

# 2. Install dependencies
npm install

# 3. Create your environment file (see next section)
cp .env.example .env

# 4. Start the app
npx expo start
```

Then scan the QR code with **Expo Go**, or press `a` (Android) / `i` (iOS) to open an emulator.

### Running with Google Sign-In
Google Sign-In does **not** work in Expo Go. Use a development build:

```bash
npx expo run:android
# or
npx expo run:ios
```

---

## 🔑 Environment Variables & Configuration

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
EXPO_PUBLIC_GROQ_API_KEY=your_groq_api_key
```

**Other configuration (edit in code):**

| File | What to set |
|------|-------------|
| `src/config/firebase.js` | Your Firebase project config |
| `src/config/googleAuth.js` | `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID`, `GOOGLE_ANDROID_CLIENT_ID` |
| `src/context/UserContext.js` & `ProviderContext.js` | Cloudinary cloud name & unsigned upload preset |

**Firebase setup checklist**
1. Enable **Authentication → Email/Password** (and **Google** if needed)
2. Create a **Firestore** database
3. Add **Firestore security rules** so users can only read/write their own data (admin-only access for the global bookings listener)
4. To create an Admin: sign up normally, then set `role: "admin"` on that user's document in `users/{uid}`

---

## ⚠️ Known Limitations & Notes

- **Expo Go + Android push notifications:** Remote push is not available in Expo Go (SDK 53+). The app uses **local notifications only** and guards the import to avoid crashes.
- **Google Sign-In** requires a development build, not Expo Go.
- **AI keys in the client:** `EXPO_PUBLIC_*` variables are bundled into the app. For production, route AI calls through a backend/Cloud Function so keys aren't exposed.
- **Security rules matter:** Firebase config and Cloudinary unsigned presets are public by design — protect data with strict Firestore rules and restrict the Cloudinary preset.
- **Payments:** There is no online payment gateway yet; payment is handled outside the app (see Help & Support FAQ).
- **Mock data:** `mockData.js` provides sample providers shown alongside real Firestore providers. Admin moderation applies only to real providers.
- **Location coverage:** The sector-name location matching is tuned for **Islamabad**; other cities fall back to GPS pins or approximate placement.
- Some drawer items may show a "coming soon" message.

---

## 🗺️ Roadmap

- [ ] Online payments (JazzCash / Easypaisa / cards)
- [ ] Remote push notifications via FCM
- [ ] Interactive map view (Google Maps / Mapbox)
- [ ] Provider availability calendar
- [ ] Multi-language support (English / Urdu)
- [ ] Backend proxy for AI keys
- [ ] Automated tests & CI/CD

---

## 📄 License

This project is for educational / portfolio purposes. Add your preferred license here (e.g., MIT).

---

<p align="center"><b>Local Service Hub</b> — Find. Book. Get It Done. 🛠️</p>
