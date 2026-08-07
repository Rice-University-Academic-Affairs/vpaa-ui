# Admin Auth & Nav Plan (Fabric SSO + email membership)

Align vpaa-ui admin with how Rice Fabric apps actually authenticate, based on:

- [Fabric-Data-App-Template](https://github.com/Rice-University-Academic-Affairs/Fabric-Data-App-Template)
- Current admin code in this repo (`src/lib/admin/**`, `src/routes/admin/**`)
- `@microsoft/rayfin-auth` / `@microsoft/rayfin-auth-provider-fabric` session shape

## What research shows

### Fabric SSO (not a separate invite system)

Template flow:

1. App runs inside Fabric portal iframe (`?fabricEmbedded=true`).
2. `+layout.ts` calls `bootstrapAuth().initEmbeddedAuth()` (Rayfin Fabric provider).
3. Entra / institutional SSO completes; Rayfin returns an `OpaqueSession`.
4. Template currently only exposes `{ authenticated: boolean }` and **drops** `session.user`.

After SSO, Rayfin’s public session identity is:

```ts
session.user = { id: string /* JWT sub */, email: string /* Entra email claim */ }
```

There is no first-class Entra `oid` on `OpaqueSession`. Built-in Rayfin roles are only Authenticated/Anonymous — **not** app-admin.

### Implications for our admin model

| Concern | Recommendation |
| --- | --- |
| Primary admin key | **Normalized email** from `session.user.email` |
| Fabric app invite | Already handled by Fabric; **do not** reinvent invite-to-app |
| App-admin allowlist | Still needed: `AdminUser` rows in **our** DB (email allowlist + configured owner email) |
| `userId` / `bindOnLogin` | **Drop as an access requirement.** Optional later as audit metadata only |
| Spoofing | Email comes from IdP via Rayfin session. Client-side identity must never authorize writes alone; trusted membership checks (Rayfin function / data policy) remain required for mutations |
| Admin nav | Hide unless membership check already succeeded |

`userId` binding was useful against “email string without SSO.” With Fabric SSO, the email claim is IdP-backed, and Fabric already controls who can open the app. Keeping bind-on-login adds UX noise without matching how operators think about admins.

## Target UX

1. User opens app in Fabric → SSO → we have email.
2. App shell asks: is this email the owner **or** in `AdminUser`?
3. If yes: show **Admin** nav and allow `/admin/**`.
4. If no: no Admin tab; deep links to `/admin` still get Forbidden / Sign in as appropriate.
5. Managing admins = add/remove **emails** on an allowlist (people who already have Fabric access). No pending-invite / User ID fields in the happy path.

## Current gaps in this repo

1. Root `+layout.svelte` always shows Admin.
2. Production `/admin` layout never wires Rayfin session (`Sign in required` stub outside test mode).
3. Membership `check` / `assertAdmin` require `userId` **and** email; bind-on-login stamps `userId`.
4. Admin Users UI surfaces raw `userId` and invite/bind semantics.
5. Test harness identities are `userId`-centric; E2E asserts bind fills `#member-userId`.
6. No shared app-level auth context for nav gating (Fabric template pattern not ported).

## Plan (phased)

### Phase A — Auth context (Fabric-template shaped)

Port the template’s auth bootstrap into this showcase/library consumers can copy:

- `getRayfinClient()` + `bootstrapAuth().initEmbeddedAuth()` (or a thin adapter).
- Root `+layout.ts` (ssr false for admin/auth paths as needed) returns:

```ts
{
  authenticated: boolean;
  email: string | null; // normalized when present
}
```

- Dev/test: keep `__ADMIN_TEST__` / `PUBLIC_ADMIN_TEST_MODE` as an alternate identity source that supplies **email only**.

### Phase B — Email-only membership

Simplify identity and membership:

- `AdminIdentity = { email: string }` (drop required `userId`).
- `check(identity)`: owner email **or** row with matching normalized email.
- Remove `bindOnLogin` from the access path (delete or no-op).
- Trusted Rayfin helper mirrors the same email-only rules.
- `AdminUser` entity: keep `email` as the unique key; make `userId` optional/unused or remove from generated admin UI fields.
- Create admin = enter email → `membership.add`. Detail = email + created metadata; status is simply “listed admin,” not Pending/Bound.

### Phase C — Gate Admin nav + routes

- Root layout: include Admin nav item **only when** `membership.check({ email })` allows (after auth load).
- `/admin` layout: same check; unauthenticated → sign-in / embed message; authenticated non-admin → Forbidden; admin → children.
- Deep links never reveal data before the check.

### Phase D — Tests & docs

- Unit: email-only owner/allowlist/non-admin/unauthenticated; no bind tests as access requirements.
- E2E: Admin tab absent for non-admin; present for owner/admin; add/remove admin by email; no `#member-userId` assertions.
- Update `docs/admin-test-plan.md` / review plan: Fabric SSO + email allowlist; clarify AdminUser ≠ Fabric invite.
- Authenticity probes: nav visibility + membership.check email path.

### Phase E — Consumer wiring note

This package is a UI library + showcase. Document the integration contract for Fabric apps:

1. Call `initEmbeddedAuth` in app layout.
2. Pass `{ email }` into admin context / membership.
3. Use `RayfinAdminData` + trusted membership function for production writes.
4. Showcase may continue using MemoryAdminData under test mode.

## Out of scope (for this plan)

- Replacing Fabric’s own user invite UX.
- Entra group → admin mapping (can be a later enhancement if Rice wants group-based admins).
- Full production Rayfin data backend standup (still blocked on Rayfin availability; auth/nav/membership model can land ahead of it).

## Suggested implementation order

1. Phase B types/membership (pure, testable without Fabric embed). ✅
2. Phase C nav/route gating against harness email identities. ✅
3. Phase A auth bootstrap in showcase + docs for Fabric apps. ✅
4. Phase D test/doc updates. ✅
5. Wire RayfinAdminData when backend is ready (existing deferred work).

## Implementation status (landed)

- `src/lib/rayfin/{client,auth}.ts` + injectable Fabric init for authentic tests
- Email-only `AdminIdentity` / membership / trusted helper (no bind-on-login)
- `buildPrimaryNavigation({ isAdmin })` gates Admin tab
- Root `+layout.ts` loads Fabric auth (or test harness) and sets `isAdmin` via shared membership
- Production `/admin` layout calls `loadAppAuth` + `resolveAdminAccess` and wires `RayfinAdminData` (not a permanent stub)
- Harness `setIdentity` / Sign in call `invalidateAll()` so Admin nav stays in sync
- E2E covers nav visibility + email allowlist membership

## Decision record

- **Admin authorization key:** normalized email from Rayfin `OpaqueSession.user.email`.
- **AdminUsers table:** app-local allowlist, not Fabric invites.
- **userId / bindOnLogin:** remove from access control and primary UX.
- **Admin nav:** visible only after successful membership check.
- **Showcase allowlist store:** `getSharedAppMembership()` until a Rayfin membership RPC client is wired.
