# Admin Bug / Footgun / Test-Harness Review Plan

Two independent top-to-bottom passes. Each pass covers code, unit tests, E2E tests, and the memory/test scaffolding that stands in for Rayfin.

## Goals

1. Find real bugs and footguns in admin generator, data, membership, forms, and routes.
2. Ensure every meaningful behavior has a unit test that can actually fail for the right reason.
3. Ensure every user-visible admin flow has an E2E covering the real UI path.
4. Audit mocks/stubs/harness so they exercise real logic — not tautological fakes that cannot produce the errors under test.
5. Repeat a fresh second pass after Pass-1 fixes.

## Review matrix

| Area | Footgun focus | Test authenticity focus |
| --- | --- | --- |
| Generator (`extract.ts`, `generate-admin.ts`) | Wrong type maps, field order, relationships leaking, silent unsupported types, non-deterministic output, stale check false negatives | Tests import real `@entity` classes via tsx; unsupported path must throw `GeneratorError` with entity/field |
| Conventions / form-values | Pluralization edge cases, optional null vs empty, integer/enum/JSON rejection, datetime shapes, wiping form state | Call pure functions with real inputs; assert thrown `AdminError.fields` |
| MemoryAdminData | Cursor off-by-one, sort instability, reset leaking forbidden, UUID generation, wrong resource | Contract suite creates/lists/sorts/paginates real in-memory store — no mocked `list` |
| RayfinAdminData | Broken builder chain, missing entity client, cursor/`after` misuse | Keep thin; contract shared for when backend exists; do not fake GraphQL responses that never hit dispatch |
| Membership / access / owner-config | Email normalize, owner immutability, 401/403/409, bind-on-login races, duplicate add | Use real `MemoryAdminMembership` methods; assert status/kind on thrown `AdminError` |
| Trusted membership helper | Drift from MemoryAdminMembership semantics | Unit-test helper independently against a tiny real store |
| Routes / components | Access gate bypass, AdminUser special-case holes, delete without confirm, validation UX, pagination Previous stack | Playwright against live Vite app + harness; no route-level mocks |
| Test harness (`bootstrap.ts`, `__ADMIN_TEST__`) | Production leak, sessionStorage drift, singleton reset, forbidden not applied after reload | Isolation tests + E2E that reload and still see identity/forbidden/membership |
| Public exports / packaging | Exporting MemoryAdminData / test identities | Isolation test on `src/lib/index.ts` |

## Harness authenticity rules (anti-mock smell)

Reject tests that:

- Stub the function under test and then assert the stub was called.
- Manufacture error objects the production path cannot throw.
- Mock `MemoryAdminData.list` when testing pagination of `MemoryAdminData`.
- Use query-param “memory mode” or other production-reachable switches.

Accept tests that:

- Construct real classes (`MemoryAdminData`, `MemoryAdminMembership`, generator extract on real entities).
- Seed data and assert observable outcomes.
- For Rayfin-unavailable paths: keep a shared contract factory ready for `RayfinAdminData`, and clearly label memory results as **Admin application tests**, never Rayfin integration.

## Pass procedure

### Pass 1

1. Read every admin module and route.
2. Trace happy path + failure path for generator, CRUD, membership, forms.
3. Diff required-tests checklist vs actual specs; note gaps.
4. Inspect harness persistence and production gating.
5. Fix bugs + add/strengthen tests.
6. Run `npm test`, `npm run test:e2e`, `npm run admin:check`.

### Pass 2

1. Re-read fixed code without relying on Pass-1 notes.
2. Re-check each Pass-1 fix did not introduce new footguns.
3. Hunt remaining gaps (AdminUser E2E depth, RayfinAdminData unit smoke, trusted helper tests, generator relationship FK retention).
4. Fix + re-run full suites.

## Demo (after both passes)

Exercise every E2E-covered flow in the browser with screenshots + screen recording:

1. Owner opens `/admin` resource index
2. Non-admin 403
3. Admin users list / owner badge / no remove
4. Add / bind / remove administrator
5. Products list, Next/Previous, sort
6. Create with validation preserving values; edit; delete with confirm
7. Forbidden entity state
8. Unknown resource / missing record not-found
9. Sign-out-style unauthenticated gate + sign-in
