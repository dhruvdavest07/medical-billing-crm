# Contributing

Thanks for contributing to Healthcare CRM.

This document explains how to work in the repository, how to prepare changes for review, and what quality bar to meet before opening a pull request.

## Project Scope

This project is a multi-tenant healthcare operations application built with:

- Next.js App Router
- TypeScript
- Prisma + PostgreSQL
- Auth.js / NextAuth
- Tailwind-based UI components

The repo contains both product features and security-sensitive workflows such as:

- staff authentication and RBAC
- patient portal authentication
- audit logging
- encryption for selected sensitive fields
- billing and payment flows
- communication workflows

Changes in these areas should be made carefully and tested explicitly.

## Before You Start

Make sure you can run the project locally.

1. Install dependencies:

```bash
npm install
```

2. Create your local env file:

```bash
cp .env.example .env
```

3. Apply migrations:

```bash
npx prisma migrate deploy
```

4. Seed demo data:

```bash
npm run db:seed
```

5. Start the dev server:

```bash
npm run dev
```

Useful docs:

- [README.md](./README.md)
- [docs/feature-walkthrough.md](./docs/feature-walkthrough.md)
- [docs/vitals-ingest-contract.md](./docs/vitals-ingest-contract.md)
- [docs/superpowers/plans/2026-04-09-healthcare-crm-hardening.md](./docs/superpowers/plans/2026-04-09-healthcare-crm-hardening.md)

## Contribution Types

Good contribution categories:

- bug fixes
- feature improvements
- accessibility improvements
- security hardening
- performance improvements
- documentation updates
- refactors that reduce duplication without changing behavior

For larger changes, open an issue or discussion first so the approach can be aligned before implementation.

## Ground Rules

- Keep changes scoped and reviewable.
- Prefer fixing root causes rather than adding local workarounds.
- Preserve tenant isolation and authorization boundaries.
- Do not log secrets, session tokens, PHI, or raw patient payloads.
- Update docs when user-visible behavior, setup, or testing steps change.
- Avoid unrelated cleanup in the same pull request.

## Development Guidelines

### Coding Standards

- Use TypeScript types instead of `any` where practical.
- Follow the existing App Router and route-handler patterns.
- Prefer existing helpers in `src/lib` before introducing new infrastructure.
- Reuse safe logging helpers instead of calling `console.error` in app code.
- Keep API behavior org-scoped and permission-aware.
- When changing mutating flows, ensure audit logging remains correct.

### UI and UX

- Preserve the existing visual language unless the task is specifically a design refresh.
- Keep new UI responsive for desktop and mobile.
- Avoid introducing placeholder copy in user-facing flows.
- Ensure loading, empty, and error states are reasonable.

### Security-Sensitive Areas

Take extra care when changing:

- `src/lib/auth.ts`
- `src/lib/org.ts`
- `src/lib/audit.ts`
- `src/lib/patient-auth.ts`
- `src/lib/crypto.ts`
- `src/lib/patient-sensitive.ts`
- `src/proxy.ts`
- `src/app/api/**`

If your change touches auth, audit, encryption, billing, or patient portal flows, include explicit validation notes in the PR.

## Database Changes

If you modify the Prisma schema:

1. Update `prisma/schema.prisma`.
2. Create a migration.
3. Ensure Prisma Client still generates cleanly.
4. Check whether seed logic needs updates.
5. Document any new required env vars or rollout steps.

Recommended checks:

```bash
npx prisma validate --schema prisma/schema.prisma
npx prisma generate
```

If the change affects local demo behavior, update the seed data or walkthrough docs.

## Verification Requirements

Before opening a pull request, run:

```bash
npm run lint
npm run typecheck
npx prisma validate --schema prisma/schema.prisma
SKIP_DB_INIT=true npm run build
```

Run additional checks when relevant:

- `npm run db:seed` after seed changes
- manual patient portal login/logout verification after auth changes
- audit trail verification after mutating route changes
- live vitals flow verification after vitals or stream changes
- Stripe webhook testing after billing webhook changes
- FHIR proxy verification after integration changes

## Manual QA Expectations

Use [docs/feature-walkthrough.md](./docs/feature-walkthrough.md) as the baseline regression script.

At minimum, contributors should manually verify the flows they touched. Examples:

- patient creation or update
- appointment creation or editing
- lab result creation
- billing and payment creation
- communication creation or scheduling
- patient portal login, session, and logout behavior
- audit entries for new writes

## Pull Request Guidelines

A good pull request should include:

- a clear summary of the change
- why the change is needed
- major files or modules affected
- verification steps performed
- screenshots or recordings for UI changes when useful
- notes about migrations, env vars, or rollout requirements

Keep PRs focused. Large mixed-scope PRs are harder to review and more likely to regress security-sensitive behavior.

## Commit Guidance

- Use short, descriptive commit messages.
- Split unrelated work into separate commits where practical.
- Do not mix broad formatting churn with behavioral changes unless necessary.

Examples:

- `Fix lint`
- `Add patient session audit logging`
- `Harden vitals stream auth`

## Documentation Expectations

Update documentation when any of these change:

- setup or startup commands
- environment variables
- seeded credentials
- feature behavior
- API contracts
- security posture
- testing or validation steps

Likely docs to update:

- `README.md`
- `docs/feature-walkthrough.md`
- `docs/vitals-ingest-contract.md`
- hardening plan docs when checklist state changes

## Reporting Bugs

When filing a bug, include:

- expected behavior
- actual behavior
- reproduction steps
- screenshots or logs when helpful
- environment details

Do not include:

- secrets
- auth tokens
- raw patient data
- production database dumps

## Security Issues

If you discover a security issue:

- do not publish secrets or exploit details in a public issue
- provide a minimal reproduction description
- clearly mark the report as security-sensitive
- wait for maintainer guidance before publishing exploit details

## Licensing

This repository currently does not include a license file. Contribution and reuse terms are therefore not yet explicitly granted by a project license.

If a license is added later, contribution expectations may be updated to match it.
