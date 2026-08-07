export function advanceListPage(state: {
	pageIndex: number;
	cursorStack: readonly (string | null)[];
	hasNextPage: boolean;
	endCursor?: string;
}): { pageIndex: number; cursorStack: (string | null)[] } | null {
	if (!state.hasNextPage || !state.endCursor) return null;
	const nextIndex = state.pageIndex + 1;
	const existing = state.cursorStack.indexOf(state.endCursor);
	if (existing !== -1) {
		if (existing === nextIndex) {
			return { pageIndex: nextIndex, cursorStack: [...state.cursorStack] };
		}
		return null;
	}
	if (state.cursorStack.length !== nextIndex) return null;
	return {
		pageIndex: nextIndex,
		cursorStack: [...state.cursorStack, state.endCursor]
	};
}
