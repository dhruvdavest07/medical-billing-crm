# Security Audit Report — Medical Billing CRM

**Date:** 2026-08-19
**Scope:** Multi-tenant API surface under `src/app/api/**`
**Stack:** Next.js 16, React 19, TypeScript, Prisma 7, PostgreSQL, NextAuth, zod v4.3.6

---

## Executive Summary

The application had a **critical cross-tenant data access** flaw (order lookup by `id` without an `organizationId` filter), **broad RBAC gaps** (read access on orders/facilities/comments and the admin dashboard required no permission), **no input validation** on the orders POST body, **no length limits** on comment text, and **no rate limiting** anywhere.

All of the above are fixed in the delivered code. The remaining recommendations require infrastructure or framework configuration outside the scope of application code.

Severity counts: **Critical: 2 · High: 4 · Medium: 3 · Low: 3**

---

## Findings

### CRITICAL

#### C1 — Cross-tenant order access via `findUnique({ where: { id } })`
**Location:** `src/app/api/orders/[id]/route.ts` (GET, PATCH)
**Before:** The `[id]` route fetched an order by its primary key alone. Any authenticated user in Org A who guessed or obtained an Org B order id could read and mutate that order.
**Impact:** Full cross-tenant PHI/claims disclosure and tampering.
**Fix:** Replaced `findUnique({ where: { id } })` with `findFirst({ where: { id, organizationId: orgId } })` on both GET and PATCH. Non-existent or out-of-org orders return **404**.

#### C2 — No authorization on the admin dashboard
**Location:** `src/app/api/admin/dashboard/route.ts`
**Before:** Any authenticated user could call `GET /api/admin/dashboard` and read org-wide aggregate counts.
**Impact:** Privilege escalation / information disclosure.
**Fix:** Added `isAdmin()` check via `src/lib/authz.ts`. 403 otherwise.

### HIGH

#### H1 — Missing `billing:read` check on order/facility/document reads
**Fix:** Added `hasPermission(userId, orgId, "billing:read", "billing")` to every GET.

#### H2 — Missing `billing:write` check on `PATCH /api/orders/[id]`
**Fix:** Added `hasPermission(..., "billing:write", "billing")` before any mutation.

#### H3 — No input validation on `POST /api/orders`
**Fix:** Added `CreateOrderSchema` (zod, `.strict()`) — `status` is now a zod enum, `priority` bounded, dates coerced and order-validated. `organizationId`, `createdById`, `orderNumber` are server-derived only.

#### H4 — No input validation on `PATCH /api/orders/[id]` (mass-assignment risk)
**Fix:** Added `UpdateOrderSchema` — a `.strict().partial()` allow-list. `organizationId`, `patientId`, `createdById`, `orderNumber` are explicitly absent.

### MEDIUM

#### M1 — Comments: no permission check, no length limit, no rate limit
**Fix:** `billing:write` required to POST, `billing:read` to list. Text capped at 5000 chars. Rate-limited at 10/min/user. Org membership verified before inserting.

#### M2 — Facility DELETE / PATCH did not exist
**Fix:** Added org-scoped PATCH/DELETE with `billing:write` and AuditLog.

#### M3 — Employee targets & documents not confirmed org-scoped
**Fix:** Documents API now org-scoped with MIME/size validation.

### LOW

#### L1 — Search params unbounded → length-capped to 100
#### L2 — 404 vs 403 leakage → uniform 404 for not-found-in-org
#### L3 — Error responses leak internal detail → generic client errors

---

## New Shared Modules

| Module | Purpose |
|--------|---------|
| `src/lib/validation.ts` | Zod schemas for all API inputs |
| `src/lib/rate-limit.ts` | In-memory rate limiter (Redis-compatible API) |
| `src/lib/authz.ts` | Admin role check helper |

---

## Recommendations (require infrastructure / config changes)

1. **Shared rate-limit store.** Replace in-memory Map with Redis/Upstash for multi-instance deployments.
2. **Transport security.** Enforce HTTPS/TLS at the platform layer. Set `Secure`, `HttpOnly`, `SameSite=Strict` on session cookies.
3. **Security headers.** Add CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy via `next.config.ts` headers or middleware.
4. **PHI redaction in logs.** Ensure `logServerError` redacts patient names, MRNs, claim numbers before writing to external log sinks.
5. **Session security.** Rotate a�EXTAUTH_SECRET` regularly. Consider session timeout policies.
