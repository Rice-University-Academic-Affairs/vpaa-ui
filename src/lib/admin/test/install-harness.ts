import { invalidateAll } from "$app/navigation";
import type { AdminIdentity } from "../types.js";
import {
	getTestAdminContext,
	persistTestIdentity,
	testIdentities,
	type TestAdminHarness
} from "./bootstrap.js";

export function installAdminTestWindow(harness: TestAdminHarness = getTestAdminContext()): void {
	window.__ADMIN_TEST__ = {
		setIdentity: async (next: AdminIdentity | null) => {
			persistTestIdentity(next);
			harness.identity = next;
			await invalidateAll();
		},
		resetData: () => harness.resetData(),
		setForbidden: (names) => harness.setForbidden(names),
		membership: harness.membership,
		data: harness.data,
		identities: testIdentities
	};
}
