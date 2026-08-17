import type { AdminUserDataClient, AdminUserRow, RayfinMembershipClient } from "../rayfin-admin-membership.js";

export function createFakeAdminUserClient(
	seed: AdminUserRow[] = [],
	options?: { pageSize?: number }
): {
	client: RayfinMembershipClient;
	rows: Map<string, AdminUserRow>;
} {
	const rows = new Map<string, AdminUserRow>(seed.map((row) => [row.id, { ...row }]));
	const pageSizeCap = options?.pageSize;

	const entity: AdminUserDataClient = {
		select: (_fields: string[]) => ({
			where: (filter: Record<string, unknown>) => {
				const emailFilter = filter.email as { eq?: string } | undefined;
				const match = () =>
					[...rows.values()].filter((row) => {
						if (emailFilter?.eq != null) return row.email === emailFilter.eq;
						return true;
					});
				return {
					first: (_n: number) => ({
						execute: async () => match().slice(0, 1)
					}),
					execute: async () => match()
				};
			},
			orderBy: (_order: Record<string, "asc" | "desc">) => ({
				first: (n: number) => {
					const size = pageSizeCap ?? n;
					const sorted = () =>
						[...rows.values()].sort((a, b) => a.email.localeCompare(b.email));
					const pageFrom = (offset: number) => {
						const items = sorted().slice(offset, offset + size);
						const hasNextPage = offset + size < sorted().length;
						const endCursor = hasNextPage ? String(offset + size) : undefined;
						return { items, hasNextPage, endCursor };
					};
					return {
						executePaginated: async () => pageFrom(0),
						after: (cursor: string) => ({
							executePaginated: async () => pageFrom(Number(cursor) || 0)
						})
					};
				}
			})
		}),
		create: async (values: Record<string, unknown>) => {
			const id = typeof values.id === "string" && values.id ? values.id : crypto.randomUUID();
			const row: AdminUserRow = {
				id,
				email: String(values.email),
				createdAt: (values.createdAt as string | Date) ?? new Date().toISOString(),
				createdBy: String(values.createdBy ?? "")
			};
			rows.set(id, row);
			return { ...row };
		},
		delete: async ({ id }) => {
			const existing = rows.get(id);
			rows.delete(id);
			return existing;
		},
		findById: async (id: string) => {
			const row = rows.get(id);
			return row ? { ...row } : null;
		}
	};

	return {
		rows,
		client: { data: { AdminUser: entity } }
	};
}
