export type AdminFieldType =
	| "string"
	| "text"
	| "integer"
	| "decimal"
	| "boolean"
	| "date"
	| "datetime"
	| "enum";

export type AdminField = {
	name: string;
	type: AdminFieldType;
	nullable: boolean;
	readOnly: boolean;
	generated: boolean;
	enumValues?: readonly string[];
	primaryKey?: boolean;
};

export type AdminDeletePolicy = "cascade" | "restrict";

export type AdminChildRelation = {
	childResource: string;
	foreignKey: string;
	policy: AdminDeletePolicy;
	parentField?: string;
};

export type AdminResource = {
	name: string;
	slug: string;
	fields: readonly AdminField[];
	children?: readonly AdminChildRelation[];
};

export type AdminResources = Record<string, AdminResource>;

export type AdminRecord = Record<string, unknown> & { id: string };

export type ListSort = {
	field: string;
	direction: "asc" | "desc";
};

export type ListRequest = {
	limit?: number;
	cursor?: string | null;
	sort?: ListSort;
};

export type ListResult = {
	items: AdminRecord[];
	hasNextPage: boolean;
	endCursor?: string;
};

export type DeleteChildBucket = {
	resource: string;
	foreignKey: string;
	policy: AdminDeletePolicy;
	count: number;
	sampleIds: string[];
	reason?: "shared";
};

export type AdminDeleteImpact = {
	resource: string;
	id: string;
	blocking: DeleteChildBucket[];
	cascading: DeleteChildBucket[];
	canDelete: boolean;
};

export type AdminErrorKind = "validation" | "forbidden" | "not_found" | "conflict" | "unauthorized" | "unexpected";

export class AdminError extends Error {
	readonly kind: AdminErrorKind;
	readonly status: number;
	readonly fields?: Record<string, string>;

	constructor(kind: AdminErrorKind, message: string, options?: { status?: number; fields?: Record<string, string> }) {
		super(message);
		this.name = "AdminError";
		this.kind = kind;
		this.status =
			options?.status ??
			({
				validation: 400,
				unauthorized: 401,
				forbidden: 403,
				not_found: 404,
				conflict: 409,
				unexpected: 500
			}[kind] as number);
		this.fields = options?.fields;
	}
}

export interface AdminData {
	list(resource: string, request?: ListRequest): Promise<ListResult>;
	get(resource: string, id: string): Promise<AdminRecord | null>;
	create(resource: string, values: Record<string, unknown>): Promise<AdminRecord>;
	update(resource: string, id: string, values: Record<string, unknown>): Promise<AdminRecord>;
	inspectRemove(resource: string, id: string): Promise<AdminDeleteImpact>;
	remove(resource: string, id: string): Promise<void>;
}

export type AdminIdentity = {
	email: string;
};

export type AdminMembershipRecord = {
	id: string;
	email: string;
	createdAt: string;
	createdBy: string;
	isOwner: boolean;
};

export type MembershipListResult = {
	items: AdminMembershipRecord[];
};

export interface AdminMembershipService {
	check(identity: AdminIdentity | null): Promise<{ allowed: boolean; status: number }>;
	list(caller: AdminIdentity): Promise<MembershipListResult>;
	add(caller: AdminIdentity, email: string): Promise<AdminMembershipRecord>;
	remove(caller: AdminIdentity, id: string): Promise<void>;
}

export type FieldControl =
	| "text"
	| "textarea"
	| "number-integer"
	| "number-decimal"
	| "checkbox"
	| "date"
	| "datetime-local"
	| "select";
