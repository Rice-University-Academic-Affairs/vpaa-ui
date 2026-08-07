import { MemoryAdminData } from "../memory-admin-data.js";
import { MemoryAdminMembership } from "../membership.js";
import { adminResources } from "../generated/resources.js";
import { resolveOwnerAdminEmail } from "../owner-config.js";
import {
	createProductSeed,
	TEST_ADMIN,
	TEST_INVITEE,
	TEST_NON_ADMIN,
	TEST_OWNER
} from "./identities.js";
import type { AdminContext } from "../context.js";
import type { AdminIdentity, AdminMembershipRecord, AdminRecord } from "../types.js";

export type TestAdminHarness = AdminContext & {
	resetData: () => void;
	setForbidden: (names: string[]) => void;
};

const STORAGE_KEY = "vpaa-admin-test-harness";

type StoredHarness = {
	identity: AdminIdentity | null;
	forbidden: string[];
	members: Array<Omit<AdminMembershipRecord, "isOwner">>;
	products: AdminRecord[];
};

function readStore(): StoredHarness {
	const fallback: StoredHarness = {
		identity: TEST_OWNER,
		forbidden: [],
		members: [],
		products: createProductSeed(30)
	};
	if (typeof sessionStorage === "undefined") return fallback;
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		if (!raw) return fallback;
		return { ...fallback, ...(JSON.parse(raw) as Partial<StoredHarness>) };
	} catch {
		return fallback;
	}
}

function writeStore(patch: Partial<StoredHarness>) {
	if (typeof sessionStorage === "undefined") return;
	const current = readStore();
	sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }));
}

let singleton: TestAdminHarness | null = null;

export function getTestAdminContext(): TestAdminHarness {
	if (singleton) return singleton;

	const stored = readStore();
	const data = new MemoryAdminData({
		resources: adminResources,
		seed: { Product: stored.products },
		forbiddenResources: stored.forbidden
	});
	const membership = new MemoryAdminMembership({
		ownerEmail: resolveOwnerAdminEmail(),
		seed: stored.members
	});

	const persistMembers = async () => {
		const list = await membership.list(TEST_OWNER);
		writeStore({
			members: list.items
				.filter((row) => !row.isOwner)
				.map(({ isOwner: _ignored, ...row }) => row)
		});
	};

	const originalAdd = membership.add.bind(membership);
	membership.add = async (caller, email) => {
		const row = await originalAdd(caller, email);
		await persistMembers();
		return row;
	};
	const originalRemove = membership.remove.bind(membership);
	membership.remove = async (caller, id) => {
		await originalRemove(caller, id);
		await persistMembers();
	};
	const originalBind = membership.bindOnLogin.bind(membership);
	membership.bindOnLogin = async (identity) => {
		const row = await originalBind(identity);
		await persistMembers();
		return row;
	};

	const originalCreate = data.create.bind(data);
	data.create = async (resource, values) => {
		const row = await originalCreate(resource, values);
		if (resource === "Product") {
			const listed = await data.list("Product", { limit: 1000, sort: { field: "id", direction: "asc" } });
			writeStore({ products: listed.items });
		}
		return row;
	};
	const originalUpdate = data.update.bind(data);
	data.update = async (resource, id, values) => {
		const row = await originalUpdate(resource, id, values);
		if (resource === "Product") {
			const listed = await data.list("Product", { limit: 1000, sort: { field: "id", direction: "asc" } });
			writeStore({ products: listed.items });
		}
		return row;
	};
	const originalRemoveData = data.remove.bind(data);
	data.remove = async (resource, id) => {
		await originalRemoveData(resource, id);
		if (resource === "Product") {
			const listed = await data.list("Product", { limit: 1000, sort: { field: "id", direction: "asc" } });
			writeStore({ products: listed.items });
		}
	};

	singleton = {
		resources: adminResources,
		data,
		membership,
		identity: stored.identity,
		mode: "memory",
		resetData() {
			const products = createProductSeed(30);
			data.reset({ Product: products });
			membership.reset();
			writeStore({ identity: TEST_OWNER, forbidden: [], members: [], products });
			this.identity = TEST_OWNER;
		},
		setForbidden(names: string[]) {
			data.setForbidden(names);
			writeStore({ forbidden: names });
		}
	};

	return singleton;
}

export function persistTestIdentity(identity: AdminIdentity | null) {
	writeStore({ identity });
	if (singleton) singleton.identity = identity;
}

export const testIdentities = {
	TEST_OWNER,
	TEST_ADMIN,
	TEST_INVITEE,
	TEST_NON_ADMIN
};
