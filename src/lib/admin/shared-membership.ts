import { MemoryAdminMembership } from "./membership.js";
import { resolveOwnerAdminEmail } from "./owner-config.js";

let shared: MemoryAdminMembership | null = null;

/** Test/showcase harness only. Production uses RayfinAdminMembership + client.data.AdminUser. */
export function getSharedAppMembership(options?: {
	ownerEmail?: string;
}): MemoryAdminMembership {
	if (!shared) {
		shared = new MemoryAdminMembership({
			ownerEmail: options?.ownerEmail ?? resolveOwnerAdminEmail()
		});
	}
	return shared;
}

export function resetSharedAppMembershipForTests(): void {
	shared = null;
}
