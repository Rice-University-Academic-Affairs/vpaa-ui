import type { AdminIdentity, AdminMembershipService } from "./types.js";
import { normalizeEmail } from "./owner-config.js";

export type AdminAccessStatus = "unauthenticated" | "forbidden" | "allowed" | "error";

export type AdminAccessResult = {
	status: AdminAccessStatus;
	identity: AdminIdentity | null;
};

export async function resolveAdminAccess(
	identity: AdminIdentity | null,
	membership: AdminMembershipService
): Promise<AdminAccessResult> {
	if (!identity?.email || !normalizeEmail(identity.email)) {
		return { status: "unauthenticated", identity: null };
	}
	const check = await membership.check(identity);
	if (check.status === 401) return { status: "unauthenticated", identity };
	if (check.status >= 500) return { status: "error", identity };
	if (!check.allowed) return { status: "forbidden", identity };
	return { status: "allowed", identity: { email: normalizeEmail(identity.email) } };
}
