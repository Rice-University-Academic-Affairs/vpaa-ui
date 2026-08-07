import { ADMIN_PAGE_SIZE } from "./conventions.js";

export function clampAdminListLimit(limit: number | undefined): number {
	if (limit == null || !Number.isFinite(limit)) return ADMIN_PAGE_SIZE;
	return Math.min(ADMIN_PAGE_SIZE, Math.max(1, Math.trunc(limit)));
}
