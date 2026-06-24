import type { Component } from "svelte";

export type AppNavIcon = Component<{ class?: string; size?: string | number }>;

export type AppNavItem = {
	label: string;
	href: string;
	icon?: AppNavIcon;
	exact?: boolean;
	disabled?: boolean;
	badge?: string;
};

export type AppNavGroup = {
	label?: string;
	items: AppNavItem[];
};

export function isNavItemActive(href: string, currentPath: string, exact?: boolean): boolean {
	if (exact || href === "/") return currentPath === href;
	return currentPath === href || currentPath.startsWith(`${href}/`);
}
