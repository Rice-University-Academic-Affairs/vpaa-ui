Platform Rayfin entities for the admin allowlist.

`AdminUser` is the SQL table that stores who may use `/admin`. It belongs in the
same Rayfin schema / database as the consumer's own models. Membership checks and
mutations go through `client.data.AdminUser` (frontend → Rayfin ORM → SQL).

Permissions are sized for authenticated Fabric sessions that already passed SSO;
the allowlist is an app-admin layer on top, not anonymous public access.

Demo tables (Product, Faculty, …) live under `../showcase/` — not here.
