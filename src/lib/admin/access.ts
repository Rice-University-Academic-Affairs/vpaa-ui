import type { AdminIdentity, AdminMembershipService } from "./types.js";
import { normalizeEmail } from "./owner-config.js";

export async function resolveAdminAccess(
	identity: AdminIdentity | null,
	membership: AdminMembershipService
): Promise<{ status: "unauthenticated" | "forbidden" | "allowed"; identity: AdminIdentity | null }> {
	if (!identity?.email || !normalizeEmail(identity.email)) {
		return { status: "unauthenticated", identity: null };
	}
	const check = await membership.check(identity);
	if (check.status === 401) return { status: "unauthenticated", identity };
	if (!check.allowed) return { status: "forbidden", identity };
	return { status: "allowed", identity: { email: normalizeEmail(identity.email) } };
}
