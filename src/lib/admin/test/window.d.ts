import type { AdminData, AdminIdentity, AdminMembershipService } from "../types.js";

export type AdminTestHarness = {
	setIdentity: (identity: AdminIdentity | null) => void;
	resetData: () => void;
	membership: AdminMembershipService;
	data: AdminData;
};

declare global {
	interface Window {
		__ADMIN_TEST__?: AdminTestHarness;
	}
}

export {};
