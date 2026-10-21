# DeskGuard — Library Seat Booking & Anti-Hoarding Portal

DeskGuard is a real-time library seat booking and anti-hoarding system built for university libraries. Originally bootstrapped as a single-page Vite application, the project has been migrated to a modular, production-ready **Next.js 16** architecture with live **Supabase** integration, custom Toast notification systems, role-based access control (RBAC), and Progressive Web App (PWA) capabilities.

---

## 🚀 Key Features

The application is structured into **7 core flows/screens**:
1. **S1: Authentication**: Email and password login featuring domain-based hint redirection.
2. **S2: Live Map**: Interactive 8×5 seat grid showcasing live occupancy status (`FREE`, `OCCUPIED`, `AWAY`, `ABANDONED`, `MAINTENANCE`) synced in real-time.
3. **S3: Session Management**: Active timer and status tracker allowing users to mark themselves `AWAY`, return (`BACK`), or `RELEASE` their desk manually.
4. **S4: Books Library**: Searchable catalog for students to browse and request library books.
5. **S5: Librarian Portal**: Administrative dashboard for monitoring desks, exporting session logs to CSV, forcing status overrides, and generating signed check-in QR codes.
6. **S6: Book Management**: Book issuing/return forms and overdue books tracker with student notification reminders.
7. **S7: QR Scan & Check-in**: Secure checkout validation endpoint verifying cryptographic HMAC signatures to ensure users are physically present at the desk before check-in.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Database / Backend**: Supabase (PostgreSQL, Realtime subscriptions, PG Cron, RPC database functions)
- **Styling**: Tailwind CSS v4 & PostCSS (Responsive layout, Dark Mode/Light Mode sync)
- **Animation**: Motion (Framer Motion)
- **Icons**: Lucide React
- **Cryptography**: Web Crypto API (Client-side HMAC-SHA256 verification)
- **PWA**: Web App Manifest configuration for mobile installs

---

## 📂 Project Structure

```
├── app/                      # Next.js App Router (Pages, Layouts, API endpoints)
│   ├── api/                  # API routes (QR signing and verification)
│   ├── dashboard/            # Student and Librarian dashboard sections
│   │   ├── admin/            # Librarian-only statistics and settings
│   │   ├── book-management/  # Librarian book check-out/in forms
│   │   ├── books/            # Student library catalog
│   │   ├── session/          # Student active reservation session
│   │   └── profile/          # User profile view
│   ├── login/                # S1 login screen
│   ├── scan/                 # S7 QR verification screen
│   ├── globals.css           # Global theme variables, dark/light definitions
│   └── layout.tsx            # Global context providers shell
├── components/               # Shared React Components
│   ├── map/                  # NodeGrid map layouts & info panels
│   ├── providers/            # Auth, Theme, and Toast Context Providers
│   ├── sidebar/              # Nav sidebar & mobile navbar
│   └── ui/                   # Global Toast component
├── lib/                      # Helper modules and types
│   ├── book-data.ts          # Seed catalog fallback
│   ├── crypto-utils.ts       # HMAC verification
│   ├── desk-data.ts          # Seed layout fallback
│   ├── supabase.ts           # Client-side Supabase client
│   └── supabase-admin.ts     # Server-side Supabase service-role client
├── public/                   # Static icons, manifest.json, PWA assets
├── supabase/
│   └── schema.sql            # Core database schema, RPC functions, policies, and seeds
└── middleware.ts             # Server-side edge middleware enforcing RBAC & Auth
```

---

## ⚙️ Local Setup and Installation

### 1. Prerequisites
Ensure you have **Node.js (v18.x or higher)** and active instances of:
- **Neon Serverless PostgreSQL** (free cloud DB at [neon.tech](https://neon.tech))
- **Firebase Authentication** (Google Firebase project with Email/Password sign-in enabled)

### 2. Database Schema Setup
Run the SQL definitions file located in [neon_schema.sql](neon_schema.sql) in your Neon SQL Editor. This script creates the 7 core tables:
- `Student`, `Desk`, `Session`, `QRToken`, `Librarian`, `Book`, `BookLoan`

### 3. Environment Variables Setup
Copy the environment template from `.env.example` into `.env.local` in the project root:

```ini
# Neon Serverless PostgreSQL Connection String
DATABASE_URL=postgresql://user:password@ep-sample-123456.us-east-2.aws.neon.tech/neondb?sslmode=require

# Firebase Client Configuration (from Firebase Console -> Project Settings)
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcdef123456

# Cryptographic QR HMAC Key (min 32 chars)
QR_SECRET=your-64-character-qr-hmac-secret-key-here

# Base App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Institutional Email Domains
NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN=@muj.manipal.edu
NEXT_PUBLIC_LIBRARIAN_EMAIL_DOMAIN=@jaipur.manipal.edu
```

### 4. Running the Development Server
```bash
# Install packages
npm install

# Seed Librarian and Students into database
npm run seed:users

# Run automated test suite (67 tests)
npm test

# Start local Next.js dev server
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔐 Auth, Roles & Test Account Passwords

Authentication is handled via **Firebase Authentication** (Email & Password), with profile metadata synchronized to PostgreSQL.

### Pre-Seeded Test Credentials

To log into the portal, create these users in your **[Firebase Console](https://console.firebase.google.com/)** (**Authentication** → **Users** → **Add User**):

| Role | Email Address | Password | Name / Reg No | Access Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Librarian (Admin)** | `librarian@jaipur.manipal.edu` | `DeskGuard@2026` | Head Librarian (`LIB-001`) | Full Admin Portal (`/dashboard/admin`), Desk Overrides, Maintenance Mode, User Management & Bulk CSV Import |
| **Student 1** | `aneesh.219301001@muj.manipal.edu` | `DeskGuard@2026` | Aneesh Srivastava (`MUJ2024CSE0086`) | Live Seat Map, Check-in, Away Mode, Book Loans |
| **Student 2** | `rohan.219302042@muj.manipal.edu` | `DeskGuard@2026` | Rohan Sharma (`MUJ2024ECE0042`) | Live Seat Map, Check-in, Away Mode, Book Loans |
| **Student 3** | `priya.219303115@muj.manipal.edu` | `DeskGuard@2026` | Priya Patel (`MUJ2024IT0115`) | Live Seat Map, Check-in, Away Mode, Book Loans |

> [!TIP]
> **Database Profile Sync**: Run `npm run seed:users` at any time to automatically synchronize these accounts into your Neon PostgreSQL database.
