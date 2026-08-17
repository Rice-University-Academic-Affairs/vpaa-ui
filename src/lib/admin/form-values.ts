import type { AdminField } from "./types.js";
import { AdminError } from "./types.js";
import { fieldControl } from "./conventions.js";

export type FormValues = Record<string, string | boolean>;
export type ParsedValues = Record<string, unknown>;

export function emptyFormValues(fields: readonly AdminField[]): FormValues {
	const values: FormValues = {};
	for (const field of fields) {
		if (field.readOnly || field.generated || field.primaryKey) continue;
		values[field.name] = field.type === "boolean" ? false : "";
	}
	return values;
}

export function recordToFormValues(record: Record<string, unknown>, fields: readonly AdminField[]): FormValues {
	const values = emptyFormValues(fields);
	for (const field of fields) {
		if (!(field.name in values) && (field.readOnly || field.generated || field.primaryKey)) {
			const raw = record[field.name];
			values[field.name] = formatDisplayValue(raw, field);
			continue;
		}
		if (!(field.name in values)) continue;
		const raw = record[field.name];
		if (field.type === "boolean") {
			values[field.name] = Boolean(raw);
		} else if (raw == null) {
			values[field.name] = "";
		} else if (field.type === "datetime" && (raw instanceof Date || typeof raw === "string")) {
			values[field.name] = toDatetimeLocal(raw);
		} else if (field.type === "date" && (raw instanceof Date || typeof raw === "string")) {
			values[field.name] = toDateOnly(raw);
		} else {
			values[field.name] = String(raw);
		}
	}
	return values;
}

function formatDisplayValue(raw: unknown, field: AdminField): string | boolean {
	if (field.type === "boolean") return Boolean(raw);
	if (raw == null) return "";
	if (raw instanceof Date) return raw.toISOString();
	return String(raw);
}

function toDateOnly(value: Date | string): string {
	const date = typeof value === "string" ? new Date(value) : value;
	if (Number.isNaN(date.getTime())) return "";
	return date.toISOString().slice(0, 10);
}

function toDatetimeLocal(value: Date | string): string {
	const date = typeof value === "string" ? new Date(value) : value;
	if (Number.isNaN(date.getTime())) return "";
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseFormValues(values: FormValues, fields: readonly AdminField[]): ParsedValues {
	const errors: Record<string, string> = {};
	const parsed: ParsedValues = {};

	for (const field of fields) {
		if (field.readOnly || field.generated || field.primaryKey) continue;
		const control = fieldControl(field);
		const raw = values[field.name];

		if (field.type === "boolean") {
			parsed[field.name] = Boolean(raw);
			continue;
		}

		const text = typeof raw === "string" ? raw.trim() : "";
		if (text === "") {
			if (field.nullable) {
				parsed[field.name] = null;
			} else {
				errors[field.name] = "Required";
			}
			continue;
		}

		try {
			parsed[field.name] = parseFieldValue(text, field, control);
		} catch (error) {
			errors[field.name] = error instanceof Error ? error.message : "Invalid value";
		}
	}

	if (Object.keys(errors).length > 0) {
		throw new AdminError("validation", "Please fix the highlighted fields.", { fields: errors });
	}

	return parsed;
}

function parseFieldValue(text: string, field: AdminField, control: ReturnType<typeof fieldControl>): unknown {
	switch (field.type) {
		case "integer": {
			if (!/^-?\d+$/.test(text)) throw new Error("Must be an integer");
			return Number(text);
		}
		case "decimal": {
			const n = Number(text);
			if (!Number.isFinite(n)) throw new Error("Must be a number");
			return n;
		}
		case "enum": {
			if (!field.enumValues?.includes(text)) throw new Error("Invalid option");
			return text;
		}
		case "date":
			if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error("Invalid date");
			return text;
		case "datetime": {
			const date = new Date(text);
			if (Number.isNaN(date.getTime())) throw new Error("Invalid datetime");
			return date.toISOString();
		}
		case "string":
		case "text":
			return text;
		default:
			if (control === "textarea" || control === "text") return text;
			throw new Error("Unsupported field");
	}
}
