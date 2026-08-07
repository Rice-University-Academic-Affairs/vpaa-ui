export function scrollMessagesToBottom(viewport: HTMLElement | null) {
	if (!viewport) return false;
	viewport.scrollTop = viewport.scrollHeight;
	return true;
}
