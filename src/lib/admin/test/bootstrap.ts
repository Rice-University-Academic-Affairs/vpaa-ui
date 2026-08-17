import { MemoryAdminData } from "../memory-admin-data.js";
import { MemoryAdminMembership } from "../membership.js";
import { adminResources } from "../generated/resources.js";
import {
	createProductSeed,
	DEFAULT_OWNER_ADMIN_EMAIL,
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
	records: Record<string, AdminRecord[]>;
};

function readStore(): StoredHarness {
	const fallback: StoredHarness = {
		identity: TEST_OWNER,
		forbidden: [],
		members: [],
		records: { Product: createProductSeed(30) }
	};
	if (typeof sessionStorage === "undefined") return fallback;
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		if (!raw) return fallback;
		const parsed = JSON.parse(raw) as Partial<StoredHarness> & { products?: AdminRecord[] };
		return {
			...fallback,
			...parsed,
			records: parsed.records ?? { Product: parsed.products ?? createProductSeed(30) }
		};
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
	let forbidden = [...stored.forbidden];
	const data = new MemoryAdminData({
		resources: adminResources,
		seed: stored.records,
		forbiddenResources: forbidden
	});
	const membership = new MemoryAdminMembership({
		ownerEmail: DEFAULT_OWNER_ADMIN_EMAIL,
		seed: stored.members
	});

	const persistAll = () => {
		writeStore({
			members: membership.snapshot(),
			records: data.snapshot(),
			forbidden,
			identity: singleton?.identity ?? stored.identity
		});
	};

	const wrapPersist = <Args extends unknown[], R>(
		fn: (...args: Args) => Promise<R>
	): ((...args: Args) => Promise<R>) => {
		return async (...args: Args) => {
			const result = await fn(...args);
			persistAll();
			return result;
		};
	};

	membership.add = wrapPersist(membership.add.bind(membership));
	membership.remove = wrapPersist(membership.remove.bind(membership));
	data.create = wrapPersist(data.create.bind(data));
	data.update = wrapPersist(data.update.bind(data));
	data.remove = wrapPersist(data.remove.bind(data));
	data.inspectRemove = data.inspectRemove.bind(data);
	const originalReset = data.reset.bind(data);
	data.reset = (seed?: Record<string, AdminRecord[]>) => {
		originalReset(seed);
		persistAll();
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
			data.clearForbidden();
			membership.reset();
			forbidden = [];
			this.identity = TEST_OWNER;
			writeStore({
				identity: TEST_OWNER,
				forbidden: [],
				members: [],
				records: { Product: products }
			});
		},
		setForbidden(names: string[]) {
			forbidden = [...names];
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
