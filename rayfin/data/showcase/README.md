Showcase-only Rayfin entities for the vpaa-ui demo app and E2E/generator fixtures.

These are **not** VPAA production domain models. Consumer apps should delete or
replace this folder and register their own entities in `schema.ts`.

`@authenticated("*")` here is showcase convenience only — not a production
security model. Consumers should tighten entity permissions for real apps.

Platform allowlist data is `../core/AdminUser.ts`.

Cascade deletes in the admin UI are application-level multi-delete via
`client.data.*`, not SQL `ON DELETE` constraints.
