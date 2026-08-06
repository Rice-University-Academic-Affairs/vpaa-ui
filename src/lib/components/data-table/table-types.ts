import type { RowData, SvelteTable } from "@tanstack/svelte-table";
import type { dataTableFeatures } from "./table-features.js";

export type DataTableInstance<TData extends RowData> = SvelteTable<
	typeof dataTableFeatures,
	TData
>;
