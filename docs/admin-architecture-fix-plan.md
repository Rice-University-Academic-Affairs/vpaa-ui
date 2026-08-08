# Admin + Rayfin architecture fix plan

Research basis: current `vpaa-ui` admin code, `docs/admin-auth-plan.md`, Rayfin CLI skills (`rayfin`, `rayfin-functions`), and Rayfin guide topics (permissions, known limitations, GraphQL client).

This repo is a **Svelte component library + showcase**. The admin stack must be honest about what is library/platform vs demo data, and production paths must not silently use in-memory stand-ins for Rayfin SQL.

---

## Problem statement

Several places look Rayfin-backed but are not:

| Symptom | Intent | Reality today |
| --- | --- | --- |
| Admin allowlist | `AdminUser` SQL table via Rayfin | `MemoryAdminMembership` singleton in the browser |
| “Trusted membership function” | Fabric UDF over `AdminUser` | Pure helper under `rayfin/functions/src/` with no `function_app.ts` / client RPC |
| Admin gate | Server/data authority | Svelte layout check only; entities mostly `@authenticated("*")` |
| Local `npm run dev` | Can exercise Rayfin admin | `isAdminTestMode` is true whenever `DEV` is true |
| Cascade delete | Integrity aligned with DB | Client-side multi-delete from generated metadata only |
| Demo entities | Clearly showcase | Mixed flat under `rayfin/data/` next to `AdminUser` |

The clearest footgun: **who is an admin** must live in the same Rayfin SQL database as everything else. Today it does not.

---

## Target mental model

```text
rayfin/data/core/          → platform entities (AdminUser) — real product contract
rayfin/data/showcase/      → demo-only entities (Product, Faculty*, …) — never mistaken for VPAA domain
rayfin/data/schema.ts      → registers core + showcase for THIS showcase app

src/lib/admin/*            → reusable admin UI + adapters (library)
Memory* / test harness     → explicit test/showcase mode only
RayfinAdminData            → entity CRUD via client.data
Rayfin membership UDF      → AdminUser allowlist check/add/remove (trusted)
```

Consumers of `vpaa-ui` bring their own Rayfin schema. Showcase entities stay in-repo for demos/E2E and must be labeled by path.

---

## Phase 0 — Make showcase data unmistakable in the filesystem

**Goal:** Nobody confuses demo tables with platform admin data.

### Layout

```text
rayfin/data/
  schema.ts                      # AppSchema + schema export (see Phase 1)
  core/
    AdminUser.ts                 # allowlist entity (platform)
    README.md                    # "Platform entities used by admin membership"
  showcase/
    README.md                    # "Demo-only entities for the vpaa-ui showcase / E2E"
    Product.ts
    ProductCategory.ts
    Faculty.ts
    FacultyAward.ts
    SabbaticalCredit.ts
    ResearchGrant.ts
    index.ts                     # re-exports showcase entities for generator tests
```

### Rules

1. **Only `core/AdminUser` is platform.** Everything else under `showcase/` is demo.
2. Showcase README states: not VPAA production domain; safe to delete/replace in consumer apps; used by Playwright + generator fixtures.
3. Fix showcase modeling while moving (do not leave known-broken demos):
   - `FacultyAward.facultyId`: change to `@uuid()` + `@one(() => Faculty)` (Rayfin: FK to `@uuid` PK must be `@uuid`, not `@text`).
   - `ProductCategory`: either keep under `showcase/` **and** register in schema, or delete if unused. Prefer register — it already demonstrates `@one` / FK omission in the generator.
4. Update imports: `scripts/generate-admin.ts`, generator tests, bootstrap seeds, E2E copy if needed.
5. Optional UI cue later: group showcase resources under an “Examples” heading in `/admin` index (not required for Phase 0 correctness).

### Exit criteria

- `rg "from \"./FacultyAward"` etc. resolve under `showcase/`.
- `admin:generate` still emits Product / Faculty / awards / cascade edges.
- README in `showcase/` and `core/` make the split obvious without reading this plan.

---

## Phase 1 — Schema registration honesty

**Goal:** Match Rayfin template conventions and one registry.

1. Export `schema` (Rayfin template name) from `rayfin/data/schema.ts`, composed as `[...coreEntities, ...showcaseEntities]`.
2. Keep `appEntities` as a deprecated alias → `schema` until call sites migrate (generator, tests).
3. Type `AppSchema` from core + showcase; type `getRayfinClient()` as `RayfinClient<AppSchema>` when practical.
4. Document: CLI may still scan all `@entity` files under `rayfin/data/`; **do not leave orphan entity files outside `schema`**.

### Exit criteria

- Generator and `rayfin` schema share the same explicit list.
- No entity file exists that is neither `core` nor `showcase` nor registered.

---

## Phase 2 — Admin membership in Rayfin SQL (primary footgun)

**Goal:** Allowlist rows live in the `AdminUser` table; browser memory is test-only.

### Research notes (Rayfin functions)

- Real UDFs live in `rayfin/functions/` after `rayfin functions init` (`function_app.ts`, `types.ts`, package/host config).
- Use `RayfinContext<AppSchema>` + `ctx.getDataClient()` for trusted `AdminUser` access.
- Frontend invokes via `client.functions.<name>(...)`, not by treating a pure TS helper as a backend.

### Implementation steps

1. **Scaffold** a real functions project (`npx rayfin functions init` if missing pieces).
2. **Replace** the fake helper with UDFs, e.g.:
   - `adminCheck({ email })`
   - `adminListMembers`
   - `adminAddMember({ email })`
   - `adminRemoveMember({ id })`
   Logic mirrors today’s email-only owner/allowlist rules (`normalizeEmail`, configured owner email via secret/env).
3. **Store adapter** inside the function uses `data.AdminUser` (create/list/delete). Owner remains config (`OWNER_ADMIN_EMAIL` secret), not a row that can be deleted.
4. **Client:** `RayfinAdminMembership implements AdminMembershipService` calling those UDFs.
5. **Wire production** root + admin layouts to `RayfinAdminMembership`; delete production use of `getSharedAppMembership()` or make it throw outside test mode.
6. **Keep** `MemoryAdminMembership` only for `__ADMIN_TEST__` / `PUBLIC_ADMIN_TEST_MODE`.
7. **Tighten `AdminUser` permissions:** stop world-readable `@authenticated("read")`. Prefer function-only access (no direct client CRUD — already forbidden in `RayfinAdminData`) and/or a narrow `@role` if Rayfin requires entity-level access for the function’s data client.
8. **Isolation tests:** assert production path uses Rayfin membership (or `client.functions`), **not** the memory singleton. Today’s test that forbids `new MemoryAdminMembership` while allowing `getSharedAppMembership()` locks in the footgun — rewrite it.

### Exit criteria

- Adding an admin in a Rayfin-backed environment inserts an `AdminUser` row.
- Reload / second client still sees that admin.
- Test harness unchanged for Playwright (memory OK when flag set).
- Unit tests cover UDF logic with a fake store; integration behind `test:rayfin` when backend exists.

---

## Phase 3 — Stop DEV from forcing the harness

**Goal:** Local default can hit Fabric/Rayfin admin; harness is opt-in.

1. Change `isAdminTestMode` to **only** `PUBLIC_ADMIN_TEST_MODE === "true"` (remove `|| env.DEV`).
2. Playwright / package scripts set the flag explicitly (already true in `playwright.config.ts` — verify).
3. Document: `npm run dev` without the flag expects Rayfin env (`VITE_RAYFIN_*`, owner email); use `PUBLIC_ADMIN_TEST_MODE=true npm run dev` for harness showcase.
4. Split `AdminContext.mode` (or replace it):

```ts
type AdminBackends = {
  data: "memory" | "rayfin";
  membership: "memory" | "rayfin";
};
```

Only claim `"rayfin"` per concern when that concern is actually Rayfin-backed.

### Exit criteria

- Production build path and “dev without flag” share the same membership/data wiring shape.
- Isolation tests updated for the new flag semantics.

---

## Phase 4 — Data-plane authority (admin means something)

**Goal:** Hiding the Admin nav is UX, not security.

1. **Showcase entities** under `showcase/`: keep permissive `@authenticated("*")` **only if** documented as demo-insecure; prefer a comment in each file: `// SHOWCASE ONLY: full CRUD for any authenticated user`.
2. **Platform `AdminUser`:** no client mutations; membership only via UDF (Phase 2).
3. For library guidance (README / auth plan): consumer apps must not ship `@authenticated("*")` on real domain tables; use `@role` / policies / functions.
4. Optional follow-up: admin-only mutation UDFs for showcase writes so demos also illustrate the safe pattern (larger change; can trail Phase 2).

### Exit criteria

- Docs + showcase READMEs state clearly that entity `@authenticated("*")` is demo-only.
- Auth plan decision record updated: membership UDF is required for production consumers.

---

## Phase 5 — Cascade delete honesty

**Goal:** Don’t pretend client cascade is DB integrity.

1. Short term (after Phase 0 modeling fixes): keep `cascade-delete.ts` for admin UX; document it as **application-level** delete planning for the admin UI.
2. Medium term: add a trusted `adminInspectRemove` / `adminRemove` UDF that performs the same policy in one server transaction (or rely on SQL FK `ON DELETE` once Rayfin supports / documents the desired behavior — verify against known limitations before assuming DB cascade).
3. Until then: non-admin API deletes can still orphan rows if entity permissions allow it (Phase 4).

### Exit criteria

- Plan/docs no longer imply cascade equals SQL constraints.
- Showcase Faculty ↔ awards/credits relationships are real `@one`/`@many` so generated admin edges match the demo story.

---

## Phase 6 — Doc reconciliation

Update in one pass after Phases 0–3 land:

- `docs/admin-auth-plan.md` — membership UDF + SQL `AdminUser` status; remove “memory until RPC” as the production answer.
- `docs/admin-review-plan.md` — drop stale “Rayfin wiring deferred” / bind-on-login notes.
- `docs/admin-test-plan.md` — harness flag-only; `test:rayfin` covers membership SQL.
- `docs/admin-ux-user-stories.md` — label Product / Faculty Awards as showcase examples.
- Root `README.md` — short “Admin showcase” section pointing at `rayfin/data/showcase/`.

---

## Suggested implementation order

```text
Phase 0  filesystem split + FacultyAward FK fix + ProductCategory decision
Phase 1  schema export + typed client
Phase 2  Rayfin membership UDF + RayfinAdminMembership + isolation test rewrite
Phase 3  DEV no longer implies harness + backend flags
Phase 4  permission honesty / consumer guidance
Phase 5  cascade server/DB follow-up (can overlap docs)
Phase 6  docs sync
```

Do **not** expand showcase demos while Phase 2 is open — fix the allowlist source of truth first after the filesystem split.

---

## Explicit non-goals (this plan)

- Replacing Fabric invite UX.
- Entra-group → admin mapping.
- Making cascade a general ORM feature outside admin.
- Moving the whole library off Rayfin for consumers who don’t use Fabric.

---

## Success definition

1. An operator can point at `rayfin/data/showcase/` and say “demo only,” and at `rayfin/data/core/AdminUser.ts` and say “real allowlist table.”
2. In Rayfin-backed mode, admin add/remove persists in SQL and survives reload.
3. Memory membership cannot be reached from production layout code without the explicit test flag.
4. Docs, isolation tests, and `AdminContext` backends agree with that reality.
