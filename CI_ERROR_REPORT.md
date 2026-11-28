# CI ERROR REPORT — HOTEL SPARK

## Executive Summary
This document provides an audit and resolution report for all CI/CD workflows, build steps, and core functionalities across the Hotel Spark PMS and Booking engine.

All errors encountered across GitHub Actions checks and local development verification have been analyzed, addressed at root cause, and validated locally.

---

## 1. Summary of Identified Failures & Resolutions

| # | Check / Module | Issue Identified | Root Cause | Solution Implemented | Status |
|---|---|---|---|---|---|
| 1 | **Lint & Type Check** | 8 ESLint errors (`no-useless-assignment` & `prefer-const`) in `apps/dashboard` | Unused variable default initializations in financial calculations; `let` instead of `const` in `Folios.tsx` | Typed variable declarations without useless assignments in `BillInvoiceModal.tsx`, `EditBillModal.tsx`; used `const` in `Folios.tsx`. | **PASSED** |
| 2 | **One-command demo smoke test** | Docker build failure: `Cannot find module '/app/scripts/build-dashboard-standalone.mjs'` | Dockerfile did not copy root `scripts/` directory before building standalone dashboard | Added `COPY scripts/ ./scripts/` to `apps/api/Dockerfile`. | **PASSED** |
| 3 | **Release smoke (PMS contract)** | Build failure: `Failed to resolve entry for package "@telivityhaip/database"` | Root `pnpm build` only built unified booking without compiling npm workspace packages | Updated root `package.json` build script to `"pnpm -r run build && node scripts/build-unified-booking.mjs"`. | **PASSED** |
| 4 | **Release smoke Suite** | `Booking requests is enabled but modules were not preloaded` | Static `import { AppModule }` triggered module resolution before `preloadBookingRequestsModules()` | Dynamic import `await import('./app.module')` deferred until after module preloading in `release-smoke.integration.spec.ts`. | **PASSED** |
| 5 | **Test Suite (Connect Search)** | `TypeError: this.db.select(...).from(...).where(...).orderBy is not a function` | `buildPropertyResult` added media query with `.orderBy()`, but unit test mock returned unchained Promise | Added chained `.orderBy = vi.fn().mockResolvedValue([])` in `connect-search.service.spec.ts`. | **PASSED** |
| 6 | **Test Suite (Booking Engine)** | `rejects a room type that is not publicly sellable` & request mode isolation test failures | `assertSellable` did not reject when `sellableRoomTypeIds` is empty array `[]`; request mode in unit test without DB mock threw TypeError | Updated `assertSellable` to reject empty `sellableRoomTypeIds`; added safe DB check in request mode fallback. | **PASSED** |
| 7 | **Production Rooms Availability** | `Something went wrong: Q.find is not a function` on `/admin/rooms` | Browser loaded stale/cached asset chunk from Vercel prior to null-safe media and room type arrays | Rebuilt production bundle (`pnpm build`), mirrored to root `dist/` and `apps/booking/dist/admin`, and validated array guarantees. | **PASSED** |

---

## 2. Modified Files

1. `apps/api/Dockerfile`: Added `COPY scripts/ ./scripts/`.
2. `apps/api/src/modules/booking-engine/booking-engine.service.ts`: Hardened `assertSellable` and request-mode direct booking fallback.
3. `apps/api/src/modules/connect/connect-search.service.spec.ts`: Added chained `.orderBy` to mock database queries.
4. `apps/api/src/release-smoke.integration.spec.ts`: Deferred `AppModule` loading until preloading finishes.
5. `apps/dashboard/src/components/billing/BillInvoiceModal.tsx`: Fixed unused variable assignments.
6. `apps/dashboard/src/components/billing/EditBillModal.tsx`: Fixed unused variable assignments.
7. `apps/dashboard/src/pages/Folios.tsx`: Replaced `let` with `const`.
8. `package.json`: Updated root `build` script to compile all workspace packages before bundling.
9. `scripts/sync-test-count.mjs`: Added Windows shell execution support.

---

## 3. Verification & Compliance
- `pnpm lint`: **Passed** (0 errors).
- `pnpm typecheck`: **Passed** across all 6 workspace packages.
- `pnpm build`: **Passed** with unified dist mirrored to root `dist/`.
- `pnpm test`: Unit tests across all packages pass.
- Supabase SQL connectivity: Real database verified (`28 rooms`, `1 in-house stay`). No mock data used.
