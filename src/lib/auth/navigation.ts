import type { AppNavGroup } from "$lib/types/navigation.js";
import LayoutDashboard from "@lucide/svelte/icons/layout-dashboard";

export function buildPrimaryNavigation(options: { isAdmin: boolean }): AppNavGroup[] {
	const items: AppNavGroup["items"] = [
		{ label: "Showcase", href: "/", icon: LayoutDashboard, exact: true }
	];
	if (options.isAdmin) {
		items.push({ label: "Admin", href: "/admin" });
	}
	return [{ items }];
}
