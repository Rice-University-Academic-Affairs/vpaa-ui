# Admin + Rayfin architecture fix plan

Research basis: current `vpaa-ui` admin code, `docs/admin-auth-plan.md`, Rayfin CLI skill (`rayfin` — entities, GraphQL client, Fabric SSO), and Rayfin guide topics (permissions, GraphQL data access).

**Constraint (updated):** Fabric **server UDFs are not available yet**. Do **not** plan membership (or cascade) on `rayfin/functions` / `client.functions.*`. Use the supported Rayfin loop instead:

```text
Frontend membership / admin code
  → RayfinClient (Fabric session)
  → client.data.<Entity> (Rayfin ORM data API)
  → SQL tables generated from @entity models
  → handle results in the frontend
```

(Internally that data API is GraphQL-flavored; the contract for app code is the typed `client.data` ORM client, not hand-written SQL or GraphQL.)

This repo is a **Svelte component library + showcase**. The admin stack must be honest about platform vs demo data, and production paths must not silently use in-memory stand-ins for Rayfin SQL.

---

## Problem statement

Several places look Rayfin-backed but are not:

| Symptom | Intent | Reality today |
| --- | --- | --- |
| Admin allowlist | `AdminUser` rows in the same Rayfin SQL ORM as user models | `MemoryAdminMembership` singleton in the browser |
| “Trusted membership helper” | Suggested a backend UDF | Pure TS under `rayfin/functions/src/` — not a real Rayfin path, and UDFs aren’t supported yet |
| Admin gate | Membership check against SQL allowlist via GraphQL | Svelte layout + memory store; entities mostly `@authenticated("*")` |
| Local `npm run dev` | Can exercise Rayfin admin | `isAdminTestMode` is true whenever `DEV` is true |
| Cascade delete | Admin UX over the same GraphQL/SQL data | Client-side multi-delete (fine as the Rayfin loop) but easy to confuse with DB constraints |
| Demo entities | Clearly showcase | Mixed flat under `rayfin/data/` next to `AdminUser` |

The clearest footgun: **who is an admin** must live in the same Rayfin SQL database / ORM the consumer uses for their models. Today it does not.

---

## Target mental model (no UDFs)

```text
rayfin/data/core/AdminUser.ts     → platform allowlist entity → SQL table
rayfin/data/showcase/*            → demo-only entities for this showcase app
rayfin/data/schema.ts             → registers core + showcase

Frontend membership service
  → getRayfinClient().data.AdminUser.select|create|delete|…
  → same GraphQL/SQL path as RayfinAdminData for Products/etc.

MemoryAdminMembership             → test harness / PUBLIC_ADMIN_TEST_MODE only
```

Same loop as the rest of Rayfin admin CRUD:

1. User defines (or we ship) `@entity` models.
2. Rayfin materializes SQL.
3. Frontend calls `client.data.*` with the Fabric session.
4. UI handles the result.

Consumers add `AdminUser` (or import our core entity) into **their** `schema` alongside their domain models so allowlist and app data share one database.

---

## Phase 0 — Make showcase data unmistakable in the filesystem

**Goal:** Nobody confuses demo tables with platform admin data.

### Layout

```text
rayfin/data/
  schema.ts                      # AppSchema + schema export (see Phase 1)
  core/
    AdminUser.ts                 # allowlist entity (platform)
    README.md                    # "Platform: admin allowlist table"
  showcase/
    README.md                    # "Demo-only for vpaa-ui showcase / E2E — not VPAA domain"
    Product.ts
    ProductCategory.ts
    Faculty.ts
    FacultyAward.ts
    SabbaticalCredit.ts
    ResearchGrant.ts
    index.ts                     # re-exports for generator tests
```

### Rules

1. **Only `core/AdminUser` is platform.** Everything under `showcase/` is demo.
2. Showcase README: not production VPAA domain; safe to delete/replace in consumer apps; used by Playwright + generator fixtures.
3. Fix showcase modeling while moving:
   - `FacultyAward.facultyId` → `@uuid()` + `@one(() => Faculty)` (Rayfin: FK to `@uuid` PK must be `@uuid`, not `@text`).
   - `ProductCategory`: keep under `showcase/` **and** register in schema (demonstrates `@one` / FK field retention).
4. Update imports: generator script, generator tests, bootstrap seeds as needed.
5. Optional later: “Examples” grouping on `/admin` index.

### Exit criteria

- Showcase entities only import from `rayfin/data/showcase/`.
- `admin:generate` still emits Product / Faculty / awards / cascade edges.
- `core/` and `showcase/` READMEs make the split obvious.

---

## Phase 1 — Schema registration honesty

**Goal:** Match Rayfin template conventions and one registry.

1. Export `schema` (Rayfin template name) from `rayfin/data/schema.ts` as `[...coreEntities, ...showcaseEntities]`.
2. Keep `appEntities` as a deprecated alias → `schema` until call sites migrate.
3. Type `AppSchema` from core + showcase; prefer `RayfinClient<AppSchema>` on `getRayfinClient()` when practical.
4. No orphan `@entity` files outside `core` / `showcase` and the registered `schema` list.

### Exit criteria

- Generator and Rayfin schema share one explicit list.
- Consumer guidance: include `AdminUser` (core) in their schema next to their models.

---

## Phase 2 — Admin membership via Rayfin GraphQL/SQL (primary footgun)

**Goal:** Allowlist rows live in the `AdminUser` table through `client.data.AdminUser`. Browser memory is test-only. **No UDFs.**

### Approach (the Rayfin loop)

Implement `RayfinAdminMembership` that satisfies `AdminMembershipService` by calling the data client, the same way `RayfinAdminData` does for other entities:

| Membership API | Rayfin data call (sketch) |
| --- | --- |
| `check({ email })` | Owner email short-circuit **or** `AdminUser` query where email matches |
| `list(caller)` | Assert caller is admin, then `AdminUser.select([…]).execute()` (+ synthetic owner row in UI) |
| `add(caller, email)` | Validate + conflict checks, then `AdminUser.create({ email, createdAt, createdBy })` |
| `remove(caller, id)` | Guard owner/self, then `AdminUser.delete({ id })` |

Keep email-only rules (`normalizeEmail`, configured owner from env). Put shared rule helpers in `src/lib/admin/` (pure functions) so memory and Rayfin implementations stay aligned — **not** under `rayfin/functions/`.

### Implementation steps

1. **Permissions on `AdminUser`:** authenticated users who can open the app need enough GraphQL access for membership checks/mutations used by the admin UI (e.g. read + create/delete as appropriate). Document that Fabric SSO already gates who can load the app; the allowlist is an **app-admin** layer on top. Avoid leaving the table anonymously writable.
2. **Add `RayfinAdminMembership`** in `src/lib/admin/` (e.g. `rayfin-admin-membership.ts`) taking `RayfinClient` + owner email.
3. **Keep forbidding** generic `AdminData` CRUD on `AdminUser` (`RayfinAdminData` / `MemoryAdminData` already do). UI continues to go through `membership.*` only — but membership now hits SQL.
4. **Wire production** root + admin layouts to `RayfinAdminMembership` instead of `getSharedAppMembership()`.
5. **Memory path:** `MemoryAdminMembership` only when `PUBLIC_ADMIN_TEST_MODE` (harness). Make `getSharedAppMembership()` test-only or remove from production imports.
6. **Delete or relocate** the misleading `rayfin/functions/src/admin-membership.ts` “trusted helper” so nobody thinks UDFs are required or already shipped. Prefer pure helpers next to the membership implementations.
7. **Isolation tests:** production layouts must import Rayfin membership / `client.data` path, not the memory singleton.
8. **Tests:** unit-test Rayfin membership against a fake `client.data.AdminUser`; keep memory tests for harness; optional `test:rayfin` smoke when a backend exists.

### Honesty about security

Without server UDFs, **authorization is**: Fabric session + Rayfin entity permissions + frontend membership helpers. Anyone who can call GraphQL with a valid session under those permissions can touch `AdminUser`. That matches how Rayfin encourages frontend data access today. When UDFs arrive later, membership *could* move server-side — out of scope for this plan.

### Exit criteria

- Adding an admin in Rayfin-backed mode inserts an `AdminUser` row via GraphQL.
- Reload / second client still sees that admin (SQL persistence).
- Harness Playwright still uses memory when the test flag is set.
- No plan or code path depends on `client.functions` / UDFs.

---

## Phase 3 — Stop DEV from forcing the harness

**Goal:** Local default can hit Rayfin admin; harness is opt-in.

1. `isAdminTestMode` → **only** `PUBLIC_ADMIN_TEST_MODE === "true"` (drop `|| env.DEV`).
2. Confirm Playwright sets the flag.
3. Document: without the flag, need `VITE_RAYFIN_*` + owner email; with the flag, memory showcase.
4. Split context backends:

```ts
type AdminBackends = {
  data: "memory" | "rayfin";
  membership: "memory" | "rayfin";
};
```

### Exit criteria

- Dev-without-flag and production builds share Rayfin data + Rayfin membership wiring.
- Isolation tests match the new flag semantics.

---

## Phase 4 — Data-plane honesty for showcase entities

**Goal:** Don’t imply demo permissions are a security model.

1. Showcase entities: keep `@authenticated("*")` only with an explicit file-level note that this is **showcase-only**.
2. Platform `AdminUser`: permissions sized for the membership GraphQL calls in Phase 2 (not anonymous; not “hide behind a nonexistent UDF”).
3. Library/README guidance: consumers should tighten domain entity permissions for real apps; admin allowlist is `AdminUser` in **their** schema via the same ORM.

### Exit criteria

- Showcase READMEs + auth plan state the GraphQL/frontend loop clearly.
- No remaining “wire a membership UDF” language in active plans.

---

## Phase 5 — Cascade delete honesty

**Goal:** Cascade stays in the Rayfin frontend loop; don’t claim DB `ON DELETE`.

1. Keep `cascade-delete.ts` + `RayfinAdminData.remove` as **application-level** planning that issues multiple `client.data` deletes (same loop as everything else).
2. Do **not** plan a cascade UDF.
3. After Phase 0, showcase Faculty ↔ awards/credits use real `@one`/`@many` so generated edges match the demo.
4. Optional later (still no UDF): document concurrency limits of multi-step client deletes.

### Exit criteria

- Docs call cascade “admin UI + GraphQL multi-delete,” not SQL constraints.
- Showcase relationships are real Rayfin relations.

---

## Phase 6 — Doc reconciliation

After Phases 0–3:

- `docs/admin-auth-plan.md` — membership via `client.data.AdminUser`; retire memory-as-production and UDF language.
- `docs/admin-review-plan.md` — drop stale deferred/UDF notes.
- `docs/admin-test-plan.md` — flag-only harness; Rayfin membership contract tests.
- `docs/admin-ux-user-stories.md` — label Product / Faculty Awards as showcase.
- Root `README.md` — point at `rayfin/data/showcase/` vs `core/`.

---

## Suggested implementation order

```text
Phase 0  filesystem split + FacultyAward FK fix + ProductCategory in schema
Phase 1  schema export + typed client
Phase 2  RayfinAdminMembership via client.data.AdminUser + remove fake functions helper
Phase 3  DEV no longer implies harness + backend flags
Phase 4  permission / consumer guidance (no UDFs)
Phase 5  cascade docs + relationship honesty
Phase 6  doc sync
```

---

## Explicit non-goals

- Server UDFs / `rayfin functions` / `client.functions` (unsupported for us right now).
- Replacing Fabric invite UX.
- Entra-group → admin mapping.
- Claiming client cascade equals SQL `ON DELETE`.

---

## Success definition

1. `rayfin/data/showcase/` is obviously demo-only; `rayfin/data/core/AdminUser.ts` is the real allowlist table in the same ORM/SQL as consumer models.
2. Rayfin-backed mode: admin add/remove persists through GraphQL into SQL and survives reload.
3. Membership and entity CRUD both use `RayfinClient` → `client.data.*` — the core Rayfin loop.
4. Memory membership is unreachable from production layout code without the explicit test flag.
5. No dependency on UDFs in code or active docs.

## Implementation status

Phases 0–6 landed on branch `cursor/svelte-admin-rayfin-5de0`:

- Filesystem split + FacultyAward `@uuid`/`@one` + ProductCategory in schema
- `schema` export + typed `RayfinClient<AppSchema>`
- `RayfinAdminMembership` via `client.data.AdminUser`; `rayfin/functions` removed
- Flag-only harness (`PUBLIC_ADMIN_TEST_MODE`); production layouts use Rayfin data + membership
- Cascade remains application-level multi-delete over the same data client
- Docs updated to describe the Rayfin frontend → ORM loop (not UDFs)
