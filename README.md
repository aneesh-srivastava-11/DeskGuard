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
Ensure you have **Node.js (v18.x or higher)** and an active **Supabase** instance (either cloud or local).

### 2. Database Schema setup
Run the SQL definitions file located in [supabase/schema.sql](supabase/schema.sql) in your Supabase SQL Editor. This script:
- Creates the tables (`students`, `desks`, `sessions`, `books`, `book_issues`, `settings`).
- Enables Row Level Security (RLS) policies.
- Registers real-time listeners for the `desks` table.
- Defines core database RPC functions (`checkin_desk`, `release_desk`, `mark_away`, `mark_back`, `issue_book`, `return_book`).
- Schedules a cron sweeping job (`sweep-desks`) to automatically release expired reservations and flag abandoned away sessions.

### 3. Environment Variables Setup
Copy the environment template from `.env.example` into a new file named `.env.local` in the project root:

```ini
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-client-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-admin-service-role-key

# QR Secret Key for HMAC signature generation (min 32 chars)
QR_SECRET=a2b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7

# Base App URL for redirect routing and QR code generation
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

*Note: If environment variables are empty, the app falls back into a UI-only preview mode.*

### 4. Running the Development Server
Install npm dependencies and launch the server:

```bash
# Install packages
npm install

# Start local server
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔐 Auth & Role-Based Access Control (RBAC)

The portal dynamically protects routes server-side using Next.js Edge middleware by inspecting authentication sessions synchronized to secure cookies. Domain routing rules apply based on the email domain used at registration/login:
- **Librarians**: Email must end with `@jaipur.manipal.edu`. Granted access to the general dashboard, `/dashboard/admin`, and `/dashboard/book-management`.
- **Students**: Email must end with `@muj.manipal.edu`. Granted access to the general dashboard, `/dashboard/session`, `/dashboard/books`, and `/dashboard/profile`.
