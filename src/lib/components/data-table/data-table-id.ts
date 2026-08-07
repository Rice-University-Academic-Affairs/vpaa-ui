let nextDataTableId = 0;

export function createDataTableId(prefix: string) {
	return `${prefix}-${++nextDataTableId}`;
}
