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
		return { authenticated: false, email: null, isAdmin: false };
	}

	if (isAdminTestModeFlag) {
		const { getTestAdminContext } = await import("$lib/admin/test/bootstrap.js");
		const harness = getTestAdminContext();
		const access = await resolveAdminAccess(harness.identity, harness.membership);
		return {
			authenticated: Boolean(harness.identity?.email),
			email: harness.identity?.email ?? null,
			isAdmin: access.status === "allowed"
		};
	}

	try {
		const auth = await loadAppAuth();
		if (!auth.identity) {
			return { authenticated: false, email: null, isAdmin: false };
		}

		try {
			const membership = getSharedAppMembership();
			const access: AdminAccessResult = await resolveAdminAccess(auth.identity, membership);
			return {
				authenticated: auth.authenticated,
				email: auth.email,
				isAdmin: access.status === "allowed"
			};
		} catch {
			return {
				authenticated: auth.authenticated,
				email: auth.email,
				isAdmin: false
			};
		}
	} catch (error) {
		if (error instanceof FabricAuthConfigError) {
			return {
				authenticated: false,
				email: null,
				isAdmin: false,
				authConfigError: error.message
			};
		}
		return { authenticated: false, email: null, isAdmin: false };
	}
};
