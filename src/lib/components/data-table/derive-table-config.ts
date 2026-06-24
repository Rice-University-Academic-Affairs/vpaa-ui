import type { Column, DataTableFilter, DataTableSearch } from "$lib/types/data-table.js";
import { defaultColumnLabel } from "./column-label.js";
import { distinctFieldValues, tagVariantForValue } from "./tag-palette.js";

export function deriveSearch(
	columns: Column[],
	placeholder?: string
): DataTableSearch | undefined {
	const searchColumns = columns.filter((column) => column.searchable).map((column) => column.field);
	if (searchColumns.length === 0) return undefined;
	return { columns: searchColumns, placeholder };
}

export function deriveFilters(
	columns: Column[],
	data: Record<string, unknown>[]
): DataTableFilter[] {
	return columns
		.filter((column) => column.filterable)
		.map((column) => {
			const style = column.style ?? "text";
			const values = distinctFieldValues(data, column.field);
			return {
				column: column.field,
				label: column.label ?? defaultColumnLabel(column.field),
				options: values.map((value) => ({
					value,
					label: column.labels?.[value] ?? value,
					variant:
						style === "tag" ? tagVariantForValue(value, values) : undefined
				}))
			};
		});
}
