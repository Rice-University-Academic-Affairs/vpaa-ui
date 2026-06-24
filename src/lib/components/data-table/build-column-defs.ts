import type { ColumnDef } from "@tanstack/table-core";
import { createRawSnippet } from "svelte";
import { renderSnippet } from "$lib/components/ui/data-table/render-helpers.js";
import type { Column } from "$lib/types/data-table.js";
import { defaultColumnLabel } from "./column-label.js";
import { distinctFieldValues, tagVariantForValue } from "./tag-palette.js";

function formatMetricValue(value: unknown): string {
	const num = Number(value);
	if (!Number.isNaN(num) && !Number.isInteger(num)) return num.toFixed(2);
	return String(value ?? "");
}

function endAlignedHeader(label: string) {
	const snippet = createRawSnippet<[{ label: string }]>((get) => {
		const { label: text } = get();
		return {
			render: () => `<div class="text-end">${text}</div>`
		};
	});
	return renderSnippet(snippet, { label });
}

function titleCell(value: string) {
	const snippet = createRawSnippet<[{ value: string }]>((get) => {
		const { value: text } = get();
		return {
			render: () => `<span class="text-strong font-semibold">${text}</span>`
		};
	});
	return renderSnippet(snippet, { value });
}

function metricCell(value: string) {
	const snippet = createRawSnippet<[{ value: string }]>((get) => {
		const { value: text } = get();
		return {
			render: () => `<div class="number text-end text-xl">${text}</div>`
		};
	});
	return renderSnippet(snippet, { value });
}

function tagCell(value: string, display: string, variant: string) {
	const snippet = createRawSnippet<[{ display: string; variant: string }]>((get) => {
		const { display: text, variant: tagClass } = get();
		return {
			render: () => `<span class="${tagClass}">${text}</span>`
		};
	});
	return renderSnippet(snippet, { display, variant });
}

export function buildColumnDefs(
	columns: Column[],
	data: Record<string, unknown>[]
): ColumnDef<Record<string, unknown>>[] {
	return columns.map((column) => {
		const style = column.style ?? "text";
		const label = column.label ?? defaultColumnLabel(column.field);
		const sortedTagValues =
			style === "tag" ? distinctFieldValues(data, column.field) : [];

		const def: ColumnDef<Record<string, unknown>> = {
			accessorKey: column.field,
			header: style === "metric" ? () => endAlignedHeader(label) : label,
			enableSorting: column.sortable ?? false
		};

		def.cell = ({ row }) => {
			const raw = row.original[column.field];
			const text = String(raw ?? "");

			switch (style) {
				case "title":
					return titleCell(text);
				case "metric":
					return metricCell(formatMetricValue(raw));
				case "tag": {
					const variant = tagVariantForValue(text, sortedTagValues);
					const display = column.labels?.[text] ?? text;
					return tagCell(text, display, variant);
				}
				default:
					return text;
			}
		};

		return def;
	});
}
