import type { LayoutLoad } from "./$types";
import { browser } from "$app/environment";
import { resolveAdminAccess, type AdminAccessResult } from "$lib/admin/access.js";
import { isAdminTestMode } from "$lib/admin/mode.js";
import { getSharedAppMembership } from "$lib/admin/shared-membership.js";
import { FabricAuthConfigError, loadAppAuth } from "$lib/rayfin/auth.js";

export const ssr = false;

const isAdminTestModeFlag = isAdminTestMode();

export const load: LayoutLoad = async () => {
	if (!browser) {
		return {
			adminMode: "loading" as const,
			access: { status: "unauthenticated" as const, identity: null } satisfies AdminAccessResult
		};
	}

	if (isAdminTestModeFlag) {
		const { getTestAdminContext } = await import("$lib/admin/test/bootstrap.js");
		const harness = getTestAdminContext();
		const access = await resolveAdminAccess(harness.identity, harness.membership);
		return { adminMode: "test" as const, access };
	}

	try {
		const auth = await loadAppAuth();
		const membership = getSharedAppMembership();
		const access = await resolveAdminAccess(auth.identity, membership);
		return { adminMode: "production" as const, access };
	} catch (error) {
		const message =
			error instanceof FabricAuthConfigError
				? error.message
				: error instanceof Error
					? error.message
					: "Unable to verify administrator access.";
		return {
			adminMode: "production" as const,
			access: { status: "error" as const, identity: null } satisfies AdminAccessResult,
			adminError: message
		};
	}
};
