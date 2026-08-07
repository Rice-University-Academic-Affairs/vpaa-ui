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

export type InboundChildEdge = {
	parentResource: string;
	foreignKey: string;
	policy: AdminChildRelation["policy"];
};

export function inboundChildEdges(
	resources: AdminResources,
	childResource: string
): InboundChildEdge[] {
	const edges: InboundChildEdge[] = [];
	for (const parent of Object.values(resources)) {
		for (const child of parent.children ?? []) {
			if (child.childResource !== childResource) continue;
			edges.push({
				parentResource: parent.name,
				foreignKey: child.foreignKey,
				policy: child.policy
			});
		}
	}
	return edges;
}

export function isSharedChildRecord(
	record: AdminRecord,
	ownerForeignKey: string,
	parentId: string,
	inbound: readonly InboundChildEdge[],
	doomed: ReadonlySet<string>
): boolean {
	for (const edge of inbound) {
		if (edge.foreignKey === ownerForeignKey) continue;
		const value = record[edge.foreignKey];
		if (value == null || value === "") continue;
		if (String(value) === String(parentId)) continue;
		if (doomed.has(`${edge.parentResource}:${String(value)}`)) continue;
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

function sameParentSiblingKeys(
	parentChildren: readonly AdminChildRelation[],
	childResource: string,
	ownerForeignKey: string
): string[] {
	return parentChildren
		.filter((child) => child.childResource === childResource && child.foreignKey !== ownerForeignKey)
		.map((child) => child.foreignKey);
}

function isSharedBySameParentSiblings(
	record: AdminRecord,
	ownerForeignKey: string,
	parentId: string,
	siblingKeys: readonly string[]
): boolean {
	for (const key of siblingKeys) {
		const value = record[key];
		if (value == null || value === "") continue;
		if (String(value) === String(parentId)) continue;
		return true;
	}
	return false;
}

async function markCascadeClosure(
	resources: AdminResources,
	store: CascadeStore,
	resource: string,
	id: string,
	doomed: Set<string>
): Promise<void> {
	const key = `${resource}:${id}`;
	if (doomed.has(key)) return;
	doomed.add(key);

	const parentChildren = childrenOf(resources, resource);
	for (const relation of parentChildren) {
		if (relation.policy !== "cascade") continue;
		const siblings = sameParentSiblingKeys(parentChildren, relation.childResource, relation.foreignKey);
		const rows = matchChildren(
			await store.listAll(relation.childResource),
			relation.foreignKey,
			id
		).filter((row) => !isSharedBySameParentSiblings(row, relation.foreignKey, id, siblings));
		for (const row of rows) {
			await markCascadeClosure(resources, store, relation.childResource, String(row.id), doomed);
		}
	}
}

function willCascadeDeleteRow(
	resources: AdminResources,
	parentResource: string,
	parentId: string,
	childResource: string,
	row: AdminRecord,
	doomed: ReadonlySet<string>
): boolean {
	const parentChildren = childrenOf(resources, parentResource);
	for (const relation of parentChildren) {
		if (relation.childResource !== childResource || relation.policy !== "cascade") continue;
		if (String(row[relation.foreignKey] ?? "") !== String(parentId)) continue;
		const inbound = inboundChildEdges(resources, childResource);
		if (!isSharedChildRecord(row, relation.foreignKey, parentId, inbound, doomed)) return true;
	}
	return false;
}

async function collectImpactDeep(
	resources: AdminResources,
	store: CascadeStore,
	resource: string,
	id: string,
	doomed: ReadonlySet<string>,
	seen: Set<string>
): Promise<{ blocking: DeleteChildBucket[]; cascading: DeleteChildBucket[] }> {
	const key = `${resource}:${id}`;
	if (seen.has(key)) return { blocking: [], cascading: [] };
	seen.add(key);

	const blocking: DeleteChildBucket[] = [];
	const cascading: DeleteChildBucket[] = [];
	const parentChildren = childrenOf(resources, resource);

	for (const relation of parentChildren) {
		const rows = matchChildren(await store.listAll(relation.childResource), relation.foreignKey, id);
		if (rows.length === 0) continue;

		if (relation.policy === "restrict") {
			const blockingRows = rows.filter(
				(row) => !willCascadeDeleteRow(resources, resource, id, relation.childResource, row, doomed)
			);
			if (blockingRows.length > 0) blocking.push(toBucket(relation, blockingRows));
			continue;
		}

		const inbound = inboundChildEdges(resources, relation.childResource);
		const shared = rows.filter((row) =>
			isSharedChildRecord(row, relation.foreignKey, id, inbound, doomed)
		);
		const exclusive = rows.filter(
			(row) =>
				!isSharedChildRecord(row, relation.foreignKey, id, inbound, doomed) &&
				!seen.has(`${relation.childResource}:${String(row.id)}`)
		);

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
					doomed,
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

	const doomed = new Set<string>();
	await markCascadeClosure(resources, store, resource, id, doomed);
	const collected = await collectImpactDeep(resources, store, resource, id, doomed, new Set());
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
	const doomed = new Set<string>();
	await markCascadeClosure(resources, store, resource, id, doomed);
	const confirm = await computeDeleteImpact(resources, store, resource, id);
	if (!confirm.canDelete) {
		throw new AdminError("conflict", formatDeleteConflictMessage(confirm), { status: 409 });
	}
	await deleteTree(resources, store, resource, id, new Set(), doomed);
}

async function deleteTree(
	resources: AdminResources,
	store: CascadeStore,
	resource: string,
	id: string,
	deleted: Set<string>,
	doomed: ReadonlySet<string>
): Promise<void> {
	const key = `${resource}:${id}`;
	if (deleted.has(key)) return;

	const existing = await store.get(resource, id);
	if (!existing) return;

	const parentChildren = childrenOf(resources, resource);
	for (const relation of parentChildren) {
		const rows = matchChildren(await store.listAll(relation.childResource), relation.foreignKey, id);
		if (rows.length === 0) continue;

		if (relation.policy === "restrict") {
			const blockingRows = rows.filter(
				(row) => !willCascadeDeleteRow(resources, resource, id, relation.childResource, row, doomed)
			);
			if (blockingRows.length > 0) {
				throw new AdminError(
					"conflict",
					formatDeleteConflictMessage({
						resource,
						id,
						blocking: [toBucket(relation, blockingRows)],
						cascading: [],
						canDelete: false
					}),
					{ status: 409 }
				);
			}
			continue;
		}

		const inbound = inboundChildEdges(resources, relation.childResource);
		const shared = rows.filter((row) =>
			isSharedChildRecord(row, relation.foreignKey, id, inbound, doomed)
		);
		if (shared.length > 0) {
			throw new AdminError(
				"conflict",
				formatDeleteConflictMessage({
					resource,
					id,
					blocking: [toBucket(relation, shared, "shared")],
					cascading: [],
					canDelete: false
				}),
				{ status: 409 }
			);
		}
		for (const row of rows) {
			await deleteTree(resources, store, relation.childResource, String(row.id), deleted, doomed);
		}
	}

	deleted.add(key);
	await store.deleteOne(resource, id);
}
