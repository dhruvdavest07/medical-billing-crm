# AI Handoff Guide — Medical Billing CRM

> This document is written for AI coding assistants (Claude, Cursor, Copilot, etc.) picking up work on this repository. It covers what a recent factory run shipped, the architecture patterns to follow, known issues to fix, and how to wire up the remaining integration points.

---

## Repository

- **GitHub**: `dhruvdavest07/medical-billing-crm`
- **Base**: Forked from `pras75299/OpenHealthCRM` (MIT license)
- **Stack**: Next.js 16, React 19, TypeScript, Prisma 7, PostgreSQL, NextAuth, zod v4, Tailwind CSS 4

---

## What the Factory Run Shipped (2026-08-19)

Six parallel agents produced the following work. All new files are in the sandbox and ready to push to GitHub.

### 1. SSE Real-Time Comments
- **New files**: `src/api/orders/[id]/comments/stream/route.ts`, `src/api/facilities/[id]/comments/stream/route.ts`, `src/hooks/useSSEComments.ts`
### 2. S3 File Storage
- **New files**: `src/lib/storage.ts`, `src/api/documents/route.ts`, `src/api/documents/[id]/route.ts`
### 3. Drag-and-Drop Priority Reordering
- **New file**: `src/api/orders/reorder/route.ts`
### 4. Clearinghouse Integration
- **New files**: `src/lib/clearinghouse/index.ts`, `mock-provider.ts`, `availity-provider.ts`, `factory.ts`, `src/api/orders/[id]/submit-claim/route.ts`, `src/api/orders/[id]/claim-status/route.ts`, `src/hooks/useClaimSubmission.ts`
### 5. Facility CRUD Page
- **New files**: `src/api/facilities/[id]/route.ts`, `src/app/(dashboard)/facilities/page.tsx`, `src/app/(dashboard)/facilities/[id]/page.tsx`
### 6. Security Audit & Hardening
- **New files**: `src/lib/validation.ts`, `src/lib/rate-limit.ts`, `src/lib/authz.ts`, `SECURITY_AUDIT_REPORT.md`

## Known Issues to Fix (Priority Order)
1. Wire SSE into Order Detail Page
2. Apply Zod Validation to Orders Routes
3. Apply Zod Validation to Comments Routes
4. Apply Admin Gate to Dashboard API
5. Reconcile Orders List Page with Original
6. Add Claim Submission UI to Order Detail

## Dependencies to Install

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/modifiers @dnd-kit/utilities @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

MIT License (inherited from OpenHealthCRM upstream)
