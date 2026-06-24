export const TAG_VARIANTS = [
	"tag-success",
	"tag-info",
	"tag-warning",
	"tag-danger",
	"tag-neutral"
] as const;

export type TagVariant = (typeof TAG_VARIANTS)[number];

export function tagVariantForValue(value: string, sortedValues: string[]): TagVariant {
	const index = sortedValues.indexOf(value);
	return TAG_VARIANTS[index >= 0 ? index % TAG_VARIANTS.length : 0];
}

export function distinctFieldValues(
	data: Record<string, unknown>[],
	field: string
): string[] {
	return [...new Set(data.map((row) => String(row[field] ?? "")))].sort();
}
