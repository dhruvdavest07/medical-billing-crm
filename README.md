# Medical Billing CRM

A medical billing CRM built on top of [OpenHealthCRM](https://github.com/pras75299/OpenHealthCRM). It manages billing orders (claims), patients, medical facilities/providers, document uploads, comment timelines, employee work tracking, and target monitoring.

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS, Radix UI, Framer Motion
- **Backend**: Next.js API routes (App Router)
- **Database**: PostgreSQL with Prisma 7 ORM
- **Auth**: Auth.js (NextAuth) with role-based access control
- **Multi-tenant**: Organization-scoped data throughout

## Prerequisites

- Node.js 18+ (Node 20 recommended)
- PostgreSQL 14+ (or Neon/Supabase cloud Postgres)
- npm or yarn

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/dhruvdavest07/medical-billing-crm.git
cd medical-billing-crm
npm install

# 2. Set up environment variables
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/medical_billing_crm?schema=public"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
SKIP_DB_INIT=""
```

```bash
# 3. Run database migrations
npx prisma migrate deploy

# 4. Seed the database (creates demo org, users, patients, facilities)
npm run db:seed

# 5. Start the dev server
npm run dev
```

Open http://localhost:3000

## Demo Credentials

After seeding, log in with:

| Email | Password | Role |
|-------|----------|------|
| admin@acmeclinic.com | admin123 | Super Admin |
| ops@acmeclinic.com | admin123 | Operations |
| billing@acmeclinic.com | admin123 | Biller |

## Features

### Billing Orders (`/orders`)
- Create, search, and filter billing orders
- Search by order number, patient name, MRN, or claim number
- Filter by status (new, in_progress, submitted, pending, paid, denied, completed)
- Per-day age indicator (turns orange when an order is older than 3 days)
- Priority field for manual ordering

### Order Detail (`/orders/:id`)
Two-column layout matching the client's requirements:

**Right side (Patient & Order):**
- Patient details (name, DOB, MRN, contact info)
- Dates of service (start/end, claim number, priority)
- Comment timeline — post comments, view who said what and when
- Document upload — attach files to the order

**Left side (Facility/Provider):**
- Medical provider/facility name, contact, address
- Facility particular instructions
- Third-party processor / clearinghouse info
- Facility-specific comment box for notes and reminders

### Admin Dashboard (`/admin`)
- Summary cards: active orders, employees working, completed today, targets missed
- Order status distribution
- Active orders priority queue with editable priority
- Employee work tracking (collapsible — shows recent orders per employee)
- Target tracking (daily target vs actual, achieved/not achieved)

### Roles & Permissions
The system uses RBAC with these roles:
- **Super Admin** — full access to everything
- **Doctor** — clinical access
- **Nurse** — clinical access
- **Receptionist** — patient management
- **Biller** — billing and orders access
- **Pharmacist** — inventory and prescriptions

## Database Schema

Key models added on top of OpenHealthCRM:

```
Facility          — medical providers (name, contact, instructions, third-party processor)
BillingOrder      — the core order (orderNumber, patient, facility, status, priority, dates of service)
OrderComment      — timeline comments on orders (author, text, timestamp)
FacilityComment   — facility-specific notes (author, text, timestamp)
EmployeeTarget    — daily/weekly targets per employee per month
```

The original OpenHealthCRM models (Patient, Invoice, InsuranceClaim, Task, Document, AuditLog, etc.) are all preserved.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/orders` | List orders (search, filter by status/assignee) |
| POST | `/api/orders` | Create a new billing order |
| GET | `/api/orders/:id` | Get full order detail with relations |
| PATCH | `/api/orders/:id` | Update order status/priority/assignee |
| GET | `/api/orders/:id/comments` | List comments on an order |
| POST | `/api/orders/:id/comments` | Post a comment on an order |
| GET | `/api/facilities` | List facilities (search by name) |
| POST | `/api/facilities` | Create a facility |
| GET | `/api/facilities/:id/comments` | List facility comments |
| POST | `/api/facilities/:id/comments` | Post a facility comment |
| GET | `/api/employee-targets` | List targets with completion stats |
| POST | `/api/employee-targets` | Set/update an employee target |
| GET | `/api/admin/dashboard` | Aggregated dashboard data |

## Project Structure

```
src/
  app/
    (dashboard)/
      orders/page.tsx           — Order listing with search & filter
      orders/[id]/page.tsx      — Order detail (two-column layout)
      admin/page.tsx            — Admin dashboard
    api/
      orders/                   — Orders CRUD + comments
      facilities/               — Facilities CRUD + comments
      employee-targets/         — Target management
      admin/dashboard/         — Dashboard aggregation
  components/
    ui/dashboard-with-collapsible-sidebar.tsx  — Sidebar with nav links
  lib/
    prisma.ts                   — Prisma client
    org.ts                      — Organization context & auth
    auth.ts                     — Permission helpers
prisma/
  schema.prisma                 — Full database schema
  migrations/                   — SQL migrations
  seed.js                       — Demo data seeder
```

## For AI Assistants (Claude/Cursor)

This README is designed for easy handoff to AI coding assistants. Key context:

- **Base project**: Forked from `pras75299/OpenHealthCRM` (MIT license)
- **What was added**: 5 new Prisma models (Facility, BillingOrder, OrderComment, FacilityComment, EmployeeTarget), 7 API route files, 3 frontend pages, sidebar nav updates, 1 migration
- **Patterns to follow**: All API routes use `getOrgId()` + `assertOrgScope()` for multi-tenant isolation, `hasPermission()` for RBAC, `logServerError()` for error logging, and `AuditLog` entries for mutations
- **To add a new API route**: Copy the pattern from `src/app/api/orders/route.ts` — same imports, same try/catch, same org scoping
- **To add a new page**: Create a `.tsx` file in `src/app/(dashboard)/`, use the existing UI components from `src/components/ui/`

## What's Still Needed

- Real-time comment updates via WebSocket/SSE (currently requires manual refresh)
- S3 file storage configuration for document uploads (currently uses storage key)
- Drag-and-drop priority reordering (currently uses numeric input)
- Insurance claim integration with clearinghouse APIs
- Facility CRUD page (facilities are created via API or linked to orders)

## License

MIT (inherited from OpenHealthCRM upstream)
