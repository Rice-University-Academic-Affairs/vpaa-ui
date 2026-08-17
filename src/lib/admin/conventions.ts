import type { AdminField, AdminResource, FieldControl, ListSort } from "./types.js";

const ACRONYMS = new Set(["id", "uuid", "url", "api", "sku"]);

export function humanizeName(input: string): string {
	const spaced = input
		.replace(/[-_]+/g, " ")
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
		.trim();

	return spaced
		.split(/\s+/)
		.filter(Boolean)
		.map((part) => {
			const lower = part.toLowerCase();
			if (ACRONYMS.has(lower)) return lower.toUpperCase();
			return lower.charAt(0).toUpperCase() + lower.slice(1);
		})
		.join(" ");
}

export function pluralizeLabel(singular: string): string {
	const label = humanizeName(singular);
	if (/\s/.test(label)) {
		const parts = label.split(" ");
		parts[parts.length - 1] = pluralizeWord(parts[parts.length - 1]!);
		return parts.join(" ");
	}
	return pluralizeWord(label);
}

function pluralizeWord(word: string): string {
	if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
	if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
	if (/fee$/i.test(word)) return `${word}s`;
	return `${word}s`;
}

export function resourceSlug(entityName: string): string {
	const human = humanizeName(entityName).toLowerCase().replace(/\s+/g, "-");
	const parts = human.split("-");
	parts[parts.length - 1] = pluralizeWord(parts[parts.length - 1]!);
	return parts.join("-");
}

export function listColumns(resource: AdminResource, max = 6): AdminField[] {
	const supported = resource.fields.filter((field) => {
		if (field.type === "text") return false;
		return true;
	});
	const primary = supported.find((field) => field.primaryKey) ?? supported[0];
	const rest = supported.filter((field) => field !== primary).slice(0, Math.max(0, max - 1));
	return primary ? [primary, ...rest] : [];
}

export function defaultSort(resource: AdminResource): ListSort {
	const names = new Set(resource.fields.map((field) => field.name));
	if (names.has("updatedAt")) return { field: "updatedAt", direction: "desc" };
	if (names.has("updated_at")) return { field: "updated_at", direction: "desc" };
	if (names.has("createdAt")) return { field: "createdAt", direction: "desc" };
	if (names.has("created_at")) return { field: "created_at", direction: "desc" };
	const pk = resource.fields.find((field) => field.primaryKey)?.name ?? "id";
	return { field: pk, direction: "asc" };
}

const TEXTAREA_TOKENS = ["description", "notes", "body", "content", "summary"];

export function fieldControl(field: AdminField): FieldControl {
	if (field.type === "boolean") return "checkbox";
	if (field.type === "integer") return "number-integer";
	if (field.type === "decimal") return "number-decimal";
	if (field.type === "date") return "date";
	if (field.type === "datetime") return "datetime-local";
	if (field.type === "enum") return "select";
	if (field.type === "text") return "textarea";
	const lower = field.name.toLowerCase();
	if (TEXTAREA_TOKENS.some((token) => lower.includes(token))) return "textarea";
	return "text";
}

export function isSystemReadOnlyName(name: string): boolean {
	return (
		name === "id" ||
		name === "createdAt" ||
		name === "updatedAt" ||
		name === "created_at" ||
		name === "updated_at" ||
		name === "createdBy" ||
		name === "created_by" ||
		name === "userId" ||
		name === "user_id"
	);
}

export function writableFields(resource: AdminResource): AdminField[] {
	return resource.fields.filter((field) => !field.readOnly && !field.generated && !field.primaryKey);
}

export const ADMIN_PAGE_SIZE = 25;
