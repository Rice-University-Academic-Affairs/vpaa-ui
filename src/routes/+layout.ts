import type { LayoutLoad } from "./$types";
import { browser } from "$app/environment";
import { resolveAdminAccess } from "$lib/admin/access.js";
import { MemoryAdminMembership } from "$lib/admin/membership.js";
import { resolveOwnerAdminEmail } from "$lib/admin/owner-config.js";
import { getTestAdminContext } from "$lib/admin/test/bootstrap.js";
import { loadAppAuth } from "$lib/rayfin/auth.js";

export const ssr = false;

const isAdminTestMode =
	import.meta.env.DEV || import.meta.env.PUBLIC_ADMIN_TEST_MODE === "true";

export const load: LayoutLoad = async () => {
	if (!browser) {
		return { authenticated: false, email: null, isAdmin: false };
	}

	if (isAdminTestMode) {
		const harness = getTestAdminContext();
		const access = await resolveAdminAccess(harness.identity, harness.membership);
		return {
			authenticated: Boolean(harness.identity?.email),
			email: harness.identity?.email ?? null,
			isAdmin: access.status === "allowed"
		};
	}

	const auth = await loadAppAuth();
	if (!auth.identity) {
		return { authenticated: false, email: null, isAdmin: false };
	}

	try {
		const membership = new MemoryAdminMembership({
			ownerEmail: resolveOwnerAdminEmail()
		});
		const access = await resolveAdminAccess(auth.identity, membership);
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
};
