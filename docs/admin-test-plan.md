# Rayfin Svelte Admin — Unit & E2E Test Plan

Test-first plan for the Svelte Admin Implementation Plan. Ordinary `npm test` / `npm run test:e2e` require no Docker, Fabric credentials, or network. `npm run test:rayfin` is optional and runs only when a Rayfin backend is available.

Reporting vocabulary:

- **Admin application tests passed** — generator, conventions, forms, routes, membership UI, and CRUD against `MemoryAdminData` / test identities.
- **Rayfin integration tests passed** — shared contract + smoke suite against real `RayfinAdminData` (never conflated with memory results).

---

## A. Generator tests (`src/lib/admin/generator/*.test.ts`, `scripts/generate-admin.test.ts`)

| ID | Requirement | Assertion |
| --- | --- | --- |
| G1 | Finds all Rayfin entities | Fixture entities `Product` and `FacultyAward` (+ `AdminUser`) appear in registry |
| G2 | Field declaration order | Fields emitted in source declaration order |
| G3 | Scalar decorator mapping | `@uuid`→string/generated, `@text`→string\|text, `@int`→integer, `@decimal`→decimal, `@boolean`→boolean, `@date`→datetime, `@email`→string, `@set`→enum with values |
| G4 | Optionality | `{ optional: true }` → `nullable: true`; required otherwise |
| G5 | Generated / read-only | Primary key `id`, generated defaults, `createdAt`/`updatedAt`/`created_at`/`updated_at`, audit identity fields marked `readOnly`/`generated` |
| G6 | Relationships | `@one`/`@many` omitted from forms/tables (or flagged unsupported); scalar FK `@uuid` fields retained |
| G7 | Deterministic output | Two consecutive generates produce identical `resources.ts` |
| G8 | Unsupported constructs | Clear error naming entity, field, and unsupported decorator/type |
| G9 | Stale check | `admin:check` exits nonzero when committed output differs |
| G10 | Slug / name | Entity `Product` → slug `products`; registry key preserves entity name |

## B. Conventions & form unit tests (`src/lib/admin/conventions.test.ts`, `form-values.test.ts`, `errors.test.ts`)

| ID | Requirement | Assertion |
| --- | --- | --- |
| C1 | Humanize PascalCase | `FacultyAward` → `Faculty Award` |
| C2 | Humanize camelCase | `facultyId` → `Faculty ID` |
| C3 | Humanize snake_case | `created_at` → `Created At` |
| C4 | Humanize kebab-case | `faculty-award` → `Faculty Award` |
| C5 | Pluralize labels | `FacultyAward` → plural `Faculty Awards` |
| C6 | List columns | At most 6: primary key + first five supported scalars; skip relationships/long-text/JSON |
| C7 | Default ordering | Prefer `updatedAt`/`updated_at` desc → else `createdAt`/`created_at` desc → else PK asc |
| C8 | Field control mapping | Each normalized type maps to expected control (text, textarea, number step 1 / any, checkbox, date, datetime-local, select) |
| C9 | Textarea naming | Fields containing `description`/`notes`/`body`/`content`/`summary` use textarea |
| F1 | Parse string/text | Submits string |
| F2 | Parse integer | Valid integer → number; non-integer rejected |
| F3 | Parse decimal | Valid number → number; invalid rejected |
| F4 | Parse boolean | Checkbox → boolean |
| F5 | Parse date / datetime | Date → `YYYY-MM-DD`; datetime → ISO shape expected by Rayfin |
| F6 | Parse enum | Declared value accepted; undeclared rejected |
| F7 | Parse JSON (if supported) | Valid JSON accepted; invalid rejected |
| F8 | Required validation | Empty required → error; empty optional → `null`/`undefined` per mutation shape |
| F9 | Preserve entered values | Validation / Rayfin errors do not wipe form state |
| E1 | Map Rayfin errors | Validation → form errors; forbidden → forbidden UI state; unexpected → safe error |

## C. AdminData contract (`src/lib/admin/admin-data.contract.test.ts`)

Shared suite factory `defineAdminDataContract(factory)` run against `MemoryAdminData` on every `npm test`, and against `RayfinAdminData` under `test:rayfin`.

| ID | Assertion |
| --- | --- |
| D1 | Create then get returns same record |
| D2 | Update preserves unchanged fields |
| D3 | Remove deletes; subsequent get is null |
| D4 | Get missing id → null (consistent not-found) |
| D5 | Sort one scalar asc and desc |
| D6 | Paginate page size 25 with stable Next/Previous cursors |
| D7 | Normalized validation / forbidden / unexpected errors when implementation can produce them |
| D8 | `MemoryAdminData.reset()` clears all state between tests |
| D9 | Missing UUID PKs generated via `crypto.randomUUID()` |

## D. Membership unit tests (`src/lib/admin/access.test.ts`, `membership.test.ts`)

Use deterministic test identities + in-memory membership service (excluded from production build).

| ID | Requirement | Assertion |
| --- | --- | --- |
| M1 | Normalize emails | Uppercase / mixed → lowercase |
| M2 | Invalid owner config | Missing/invalid `OWNER_ADMIN_EMAIL` fails validation |
| M3 | Owner without AdminUser row | Owner email is administrator |
| M4 | Reject duplicate membership | Second add of same email → 409 |
| M5 | Refuse owner edit/delete | Attempt → 409 |
| M6 | Non-admin caller | Membership mutations → 403; no session → 401 |
| M7 | List includes owner | Owner appears with `Owner` badge flag; not editable/deletable |
| M8 | Add administrator | Valid admin adds by email; stamps `createdAt`/`createdBy` |
| M9 | Remove administrator | Non-owner admin can remove another non-owner |
| M10 | Bind on first login | Invited email with empty `userId` binds current Rayfin user id |
| M11 | Match by userId first | Bound `userId` recognized before email match |
| M12 | AdminUser system fields | `userId`, `createdAt`, `createdBy` read-only in admin field metadata |

## E. Production isolation tests (`src/lib/admin/isolation.test.ts`)

| ID | Assertion |
| --- | --- |
| I1 | Production entry does not export `MemoryAdminData` or test identities |
| I2 | Memory / test-identity modules are tree-shakeable / gated behind `import.meta.env.MODE` or explicit test DI only |
| I3 | No query-param / browser-setting activation of memory mode |

## F. End-to-end tests (`e2e/admin.spec.ts`) — MemoryAdminData + test identities

Playwright against showcase `/admin` with test-only DI. No Docker/network.

| ID | Flow |
| --- | --- |
| E2E1 | Configured owner opens `/admin` without AdminUser row |
| E2E2 | Non-admin receives 403 at `/admin` |
| E2E3 | Owner appears in administrator list; cannot be edited or removed |
| E2E4 | Administrator adds another administrator by email |
| E2E5 | Invited administrator recognized on sign-in and bound to user id |
| E2E6 | Non-owner administrator can add and remove additional administrators |
| E2E7 | Open a resource and see 25 records |
| E2E8 | Next and Previous cursor navigation |
| E2E9 | Sort a visible scalar column |
| E2E10 | Create a record and land on its edit page |
| E2E11 | Edit and save a record |
| E2E12 | Inline validation error without losing values |
| E2E13 | Delete only after confirmation |
| E2E14 | Forbidden state for entity permission failure |
| E2E15 | Not-found for unknown resource or missing record |
| E2E16 | `/admin` lists generated entities alphabetically with humanized names |
| E2E17 | Unauthenticated user is offered Rayfin sign-in (test identity stub) |

## G. Rayfin integration tests (`src/lib/admin/rayfin.integration.test.ts`) — optional

Gated behind env / `test:rayfin`. Not required for ordinary CI green.

| ID | Assertion |
| --- | --- |
| R1 | Shared AdminData contract against `RayfinAdminData` |
| R2 | Auth via Rayfin supported development authentication |
| R3 | Generated CRUD against synthetic records |
| R4 | Rayfin validation failure surfaced |
| R5 | Rayfin permission denial surfaced |
| R6 | Generated schema / client operation shapes compatible |

## H. Automation / scripts tests

| ID | Assertion |
| --- | --- |
| S1 | `admin:generate` writes `src/lib/admin/generated/resources.ts` |
| S2 | `predev` / `prebuild` invoke generation |
| S3 | `admin:check` detects stale output (covered by G9) |

## Coverage completeness checklist (review loop)

Before implementation, and again after each phase, confirm every Required Tests bullet from the implementation plan maps to an ID above:

- [x] Generator tests → G1–G10 (`scripts/generator.node.test.ts`, `npm run admin:check`)
- [x] Unit conventions/forms/errors → C1–C9, F1–F9, E1
- [x] Membership units → M1–M12
- [x] Data contract → D1–D9 (`MemoryAdminData`)
- [x] E2E membership + CRUD → E2E1–E2E17 (`e2e/admin.spec.ts`)
- [x] Rayfin integration → R1–R6 scaffolded behind `npm run test:rayfin` (skipped until backend available)
- [x] Isolation / no production memory path → I1–I3
- [x] Automation → S1–S3

## Latest verification

- `npm test` — Admin application unit + generator tests passed
- `npm run test:e2e` — Admin + existing showcase E2E passed
- `npm run admin:check` — generated registry fresh
- `npm run test:rayfin` — optional; not required for ordinary green CI