import {
	FieldFormat,
	getEntityMetadata,
	isRayfinEntity,
	RelationshipTypes,
	type EntityClass,
	type FieldMetadata
} from "@microsoft/rayfin-core";
import { isSystemReadOnlyName, resourceSlug } from "../conventions.js";
import type {
	AdminChildRelation,
	AdminField,
	AdminFieldType,
	AdminResources
} from "../types.js";

export type GenerateOptions = {
	entities: readonly EntityClass[];
};

export class GeneratorError extends Error {
	constructor(
		message: string,
		readonly entity?: string,
		readonly field?: string
	) {
		super(message);
		this.name = "GeneratorError";
	}
}

export function extractResources(options: GenerateOptions): AdminResources {
	const resources: AdminResources = {};

	for (const entity of options.entities) {
		if (!isRayfinEntity(entity)) {
			throw new GeneratorError(
				`Unsupported construct: expected a Rayfin @entity() class, got ${String(entity)}`
			);
		}

		const meta = getEntityMetadata(entity);
		const name = meta.name || entity.name;
		const fields: AdminField[] = [];

		for (const [fieldName, fieldMeta] of Object.entries(meta.fields)) {
			if (fieldMeta.relationship) continue;
			fields.push(normalizeField(name, fieldName, fieldMeta));
		}

		resources[name] = {
			name,
			slug: resourceSlug(name),
			fields,
			children: []
		};
	}

	for (const entity of options.entities) {
		const meta = getEntityMetadata(entity);
		const parentName = meta.name || entity.name;
		const children: AdminChildRelation[] = [];

		for (const [fieldName, fieldMeta] of Object.entries(meta.fields)) {
			if (!fieldMeta.relationship || fieldMeta.relationship.type !== RelationshipTypes.many) {
				continue;
			}
			const childClass = fieldMeta.relationship.target() as EntityClass;
			const childMeta = getEntityMetadata(childClass);
			const childName = childMeta.name || childClass.name;
			if (!resources[childName]) continue;
			const foreignKey = findForeignKeyField(childMeta, parentName);
			if (!foreignKey) continue;
			children.push({
				childResource: childName,
				foreignKey,
				policy: "cascade",
				parentField: fieldName
			});
		}

		for (const other of options.entities) {
			const otherMeta = getEntityMetadata(other);
			const otherName = otherMeta.name || other.name;
			if (otherName === parentName || !resources[otherName]) continue;
			for (const [, fieldMeta] of Object.entries(otherMeta.fields)) {
				if (!fieldMeta.relationship || fieldMeta.relationship.type !== RelationshipTypes.one) {
					continue;
				}
				const target = fieldMeta.relationship.target() as EntityClass;
				const targetMeta = getEntityMetadata(target);
				const targetName = targetMeta.name || target.name;
				if (targetName !== parentName) continue;
				const foreignKey = findForeignKeyField(otherMeta, parentName);
				if (!foreignKey) continue;
				if (
					children.some(
						(child) => child.childResource === otherName && child.foreignKey === foreignKey
					)
				) {
					continue;
				}
				if (children.some((child) => child.childResource === otherName && child.policy === "cascade")) {
					continue;
				}
				children.push({
					childResource: otherName,
					foreignKey,
					policy: "restrict"
				});
			}
		}

		resources[parentName] = {
			...resources[parentName]!,
			children: children.sort((a, b) =>
				`${a.childResource}:${a.foreignKey}`.localeCompare(`${b.childResource}:${b.foreignKey}`)
			)
		};
	}

	return resources;
}

function findForeignKeyField(
	childMeta: ReturnType<typeof getEntityMetadata>,
	parentName: string
): string | null {
	const expected = `${parentName.charAt(0).toLowerCase()}${parentName.slice(1)}Id`;
	if (childMeta.fields[expected] && !childMeta.fields[expected]?.relationship) {
		return expected;
	}
	for (const [fieldName, fieldMeta] of Object.entries(childMeta.fields)) {
		if (fieldMeta.relationship) continue;
		if (fieldName.toLowerCase() === `${parentName.toLowerCase()}id`) return fieldName;
	}
	return null;
}

export function normalizeField(entityName: string, fieldName: string, meta: FieldMetadata<any>): AdminField {
	if (!meta.format) {
		throw new GeneratorError(
			`Unsupported field type on ${entityName}.${fieldName}: missing Rayfin field decorator`,
			entityName,
			fieldName
		);
	}

	const type = mapFormat(entityName, fieldName, meta);
	const primaryKey = fieldName === "id";
	const system = Boolean(meta.isSystemType) || isSystemReadOnlyName(fieldName) || primaryKey;
	const generated = primaryKey || Boolean(meta.isSystemType);

	return {
		name: fieldName,
		type,
		nullable: Boolean(meta.isOptional),
		readOnly: system,
		generated,
		primaryKey,
		enumValues: meta.enum ? [...meta.enum] : undefined
	};
}

function mapFormat(entityName: string, fieldName: string, meta: FieldMetadata<any>): AdminFieldType {
	if (meta.enum) return "enum";

	switch (meta.format) {
		case FieldFormat.Uuid:
		case FieldFormat.Email:
			return "string";
		case FieldFormat.Text: {
			const lower = fieldName.toLowerCase();
			if (["description", "notes", "body", "content", "summary"].some((t) => lower.includes(t))) {
				return "text";
			}
			return "string";
		}
		case FieldFormat.Int:
			return "integer";
		case FieldFormat.Decimal:
			return "decimal";
		case FieldFormat.Boolean:
			return "boolean";
		case FieldFormat.Date:
			return "datetime";
		default:
			throw new GeneratorError(
				`Unsupported decorator/type on ${entityName}.${fieldName}: ${String(meta.format)}`,
				entityName,
				fieldName
			);
	}
}

export function formatResourcesModule(resources: AdminResources): string {
	const orderedKeys = Object.keys(resources).sort((a, b) => a.localeCompare(b));

	const body = orderedKeys
		.map((key) => {
			const resource = resources[key]!;
			const fields = resource.fields
				.map((field) => {
					const lines = [
						`\t\t\tname: ${JSON.stringify(field.name)}`,
						`\t\t\ttype: ${JSON.stringify(field.type)}`,
						`\t\t\tnullable: ${field.nullable}`,
						`\t\t\treadOnly: ${field.readOnly}`,
						`\t\t\tgenerated: ${field.generated}`
					];
					if (field.primaryKey) lines.push(`\t\t\tprimaryKey: true`);
					if (field.enumValues) {
						lines.push(`\t\t\tenumValues: ${JSON.stringify([...field.enumValues])} as const`);
					}
					return `\t\t{\n${lines.join(",\n")}\n\t\t}`;
				})
				.join(",\n");

			const children = (resource.children ?? [])
				.map((child) => {
					const lines = [
						`\t\t\tchildResource: ${JSON.stringify(child.childResource)}`,
						`\t\t\tforeignKey: ${JSON.stringify(child.foreignKey)}`,
						`\t\t\tpolicy: ${JSON.stringify(child.policy)}`
					];
					if (child.parentField) {
						lines.push(`\t\t\tparentField: ${JSON.stringify(child.parentField)}`);
					}
					return `\t\t{\n${lines.join(",\n")}\n\t\t}`;
				})
				.join(",\n");

			return `\t${JSON.stringify(resource.name)}: {\n\t\tname: ${JSON.stringify(resource.name)},\n\t\tslug: ${JSON.stringify(resource.slug)},\n\t\tfields: [\n${fields}\n\t\t],\n\t\tchildren: [\n${children}\n\t\t]\n\t}`;
		})
		.join(",\n");

	return `/* eslint-disable */
// This file is generated by scripts/generate-admin.ts. Do not edit by hand.

import type { AdminResources } from "../types.js";

export const adminResources = {
${body}
} as const satisfies AdminResources;

export function getResourceBySlug(slug: string) {
\treturn Object.values(adminResources).find((resource) => resource.slug === slug);
}

export function listResourceEntries() {
\treturn Object.values(adminResources).sort((a, b) => a.name.localeCompare(b.name));
}

export function resourceDisplayName(name: string): string {
\treturn name.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

export function resourcePluralLabel(name: string): string {
\tconst base = resourceDisplayName(name);
\tconst parts = base.split(" ");
\tconst last = parts[parts.length - 1] ?? base;
\tconst plural = /[^aeiou]y$/i.test(last)
\t\t? last.slice(0, -1) + "ies"
\t\t: /(s|x|z|ch|sh)$/i.test(last)
\t\t\t? last + "es"
\t\t\t: last + "s";
\tparts[parts.length - 1] = plural;
\treturn parts.join(" ");
}
`;
}
