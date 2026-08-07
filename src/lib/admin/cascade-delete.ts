import type {
	AdminChildRelation,
	AdminDeleteImpact,
	AdminRecord,
	AdminResources,
	DeleteChildBucket
} from "./types.js";
import { AdminError } from "./types.js";
import { humanizeName, pluralizeLabel } from "./conventions.js";

const SAMPLE_CAP = 5;

export function isLikelyForeignKeyField(fieldName: string): boolean {
	if (fieldName === "id") return false;
	return /Id$|_id$/.test(fieldName);
}

export function isSharedChildRecord(
	record: AdminRecord,
	ownerForeignKey: string,
	parentId: string
): boolean {
	for (const [key, value] of Object.entries(record)) {
		if (key === ownerForeignKey || key === "id") continue;
		if (!isLikelyForeignKeyField(key)) continue;
		if (value == null || value === "") continue;
		if (String(value) === String(parentId)) continue;
		return true;
	}
	return false;
}

export type CascadeStore = {
	get(resource: string, id: string): Promise<AdminRecord | null>;
	listAll(resource: string): Promise<AdminRecord[]>;
	deleteOne(resource: string, id: string): Promise<void>;
};

function childrenOf(resources: AdminResources, resource: string): readonly AdminChildRelation[] {
	return resources[resource]?.children ?? [];
}

function matchChildren(rows: AdminRecord[], foreignKey: string, parentId: string): AdminRecord[] {
	return rows.filter((row) => String(row[foreignKey] ?? "") === String(parentId));
}

function toBucket(
	relation: AdminChildRelation,
	rows: AdminRecord[],
	reason?: "shared"
): DeleteChildBucket {
	const bucket: DeleteChildBucket = {
		resource: relation.childResource,
		foreignKey: relation.foreignKey,
		policy: relation.policy,
		count: rows.length,
		sampleIds: rows.slice(0, SAMPLE_CAP).map((row) => String(row.id))
	};
	if (reason) bucket.reason = reason;
	return bucket;
}

function mergeBuckets(buckets: DeleteChildBucket[]): DeleteChildBucket[] {
	const byKey = new Map<string, DeleteChildBucket>();
	for (const bucket of buckets) {
		const key = `${bucket.resource}:${bucket.foreignKey}:${bucket.policy}:${bucket.reason ?? ""}`;
		const existing = byKey.get(key);
		if (!existing) {
			byKey.set(key, { ...bucket, sampleIds: [...bucket.sampleIds] });
			continue;
		}
		existing.count += bucket.count;
		for (const id of bucket.sampleIds) {
			if (existing.sampleIds.length >= SAMPLE_CAP) break;
			if (!existing.sampleIds.includes(id)) existing.sampleIds.push(id);
		}
	}
	return [...byKey.values()];
}

async function collectImpactDeep(
	resources: AdminResources,
	store: CascadeStore,
	resource: string,
	id: string,
	seen: Set<string>
): Promise<{ blocking: DeleteChildBucket[]; cascading: DeleteChildBucket[] }> {
	const key = `${resource}:${id}`;
	if (seen.has(key)) return { blocking: [], cascading: [] };
	seen.add(key);

	const blocking: DeleteChildBucket[] = [];
	const cascading: DeleteChildBucket[] = [];

	for (const relation of childrenOf(resources, resource)) {
		const rows = matchChildren(await store.listAll(relation.childResource), relation.foreignKey, id);
		if (rows.length === 0) continue;

		if (relation.policy === "restrict") {
			blocking.push(toBucket(relation, rows));
			continue;
		}

		const shared = rows.filter((row) => isSharedChildRecord(row, relation.foreignKey, id));
		const exclusive = rows.filter((row) => !isSharedChildRecord(row, relation.foreignKey, id));

		if (shared.length > 0) {
			blocking.push(toBucket(relation, shared, "shared"));
		}
		if (exclusive.length > 0) {
			cascading.push(toBucket(relation, exclusive));
			for (const child of exclusive) {
				const nested = await collectImpactDeep(
					resources,
					store,
					relation.childResource,
					String(child.id),
					seen
				);
				blocking.push(...nested.blocking);
				cascading.push(...nested.cascading);
			}
		}
	}

	return { blocking, cascading };
}

export async function computeDeleteImpact(
	resources: AdminResources,
	store: CascadeStore,
	resource: string,
	id: string
): Promise<AdminDeleteImpact> {
	if (!resources[resource]) {
		throw new AdminError("not_found", `Unknown resource ${resource}`);
	}
	const existing = await store.get(resource, id);
	if (!existing) {
		throw new AdminError("not_found", `Record ${id} not found`);
	}

	const collected = await collectImpactDeep(resources, store, resource, id, new Set());
	const blocking = mergeBuckets(collected.blocking);
	const cascading = mergeBuckets(collected.cascading);
	return {
		resource,
		id,
		blocking,
		cascading,
		canDelete: blocking.length === 0
	};
}

export function formatDeleteConflictMessage(impact: AdminDeleteImpact): string {
	const labels = impact.blocking.map((bucket) => {
		const label = pluralizeLabel(humanizeName(bucket.resource));
		const shared = bucket.reason === "shared" ? " (shared with another parent)" : "";
		return `${bucket.count} ${label}${shared}`;
	});
	return `Cannot delete this record because related records still reference it: ${labels.join(", ")}.`;
}

export async function performCascadeRemove(
	resources: AdminResources,
	store: CascadeStore,
	resource: string,
	id: string
): Promise<void> {
	const impact = await computeDeleteImpact(resources, store, resource, id);
	if (!impact.canDelete) {
		throw new AdminError("conflict", formatDeleteConflictMessage(impact), { status: 409 });
	}
	await deleteTree(resources, store, resource, id, new Set());
}

async function deleteTree(
	resources: AdminResources,
	store: CascadeStore,
	resource: string,
	id: string,
	deleted: Set<string>
): Promise<void> {
	const key = `${resource}:${id}`;
	if (deleted.has(key)) return;
	deleted.add(key);

	for (const relation of childrenOf(resources, resource)) {
		if (relation.policy !== "cascade") continue;
		const rows = matchChildren(
			await store.listAll(relation.childResource),
			relation.foreignKey,
			id
		).filter((row) => !isSharedChildRecord(row, relation.foreignKey, id));
		for (const row of rows) {
			await deleteTree(resources, store, relation.childResource, String(row.id), deleted);
		}
	}

	await store.deleteOne(resource, id);
}
