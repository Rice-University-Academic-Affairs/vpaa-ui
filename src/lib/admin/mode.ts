export function isAdminTestMode(
	env: { DEV?: boolean; PUBLIC_ADMIN_TEST_MODE?: string } = import.meta.env
): boolean {
	return env.PUBLIC_ADMIN_TEST_MODE === "true";
}
