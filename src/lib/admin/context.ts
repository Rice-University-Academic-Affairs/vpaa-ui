import { createContext } from "svelte";
import type { AdminData, AdminIdentity, AdminMembershipService, AdminResources } from "./types.js";

export type AdminContext = {
	resources: AdminResources;
	data: AdminData;
	membership: AdminMembershipService;
	identity: AdminIdentity | null;
	mode: "memory" | "rayfin";
};

export const [getAdminContext, setAdminContext] = createContext<AdminContext>();
