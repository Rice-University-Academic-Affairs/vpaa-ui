function getScrollContainer(element: HTMLElement): HTMLElement {
	let parent = element.parentElement;

	while (parent) {
		const { overflowY } = getComputedStyle(parent);
		if (overflowY === "auto" || overflowY === "scroll") return parent;
		parent = parent.parentElement;
	}

	return document.documentElement;
}

export function stabilizeTableScroll(root: HTMLElement, bottomBefore: number) {
	const shrink = bottomBefore - root.getBoundingClientRect().bottom;

	if (shrink > 1) {
		const container = getScrollContainer(root);
		container.scrollTop = Math.max(0, container.scrollTop - shrink);
	}

	root.focus({ preventScroll: true });
}
