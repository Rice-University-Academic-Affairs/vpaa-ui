const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
	return EMAIL_RE.test(normalizeEmail(email));
}

export function requireOwnerAdminEmail(raw: string | undefined | null): string {
	if (!raw || !String(raw).trim()) {
		throw new Error("OWNER_ADMIN_EMAIL is missing");
	}
	const email = normalizeEmail(String(raw));
	if (!isValidEmail(email)) {
		throw new Error(`OWNER_ADMIN_EMAIL is invalid: ${raw}`);
	}
	return email;
}

export const DEFAULT_OWNER_ADMIN_EMAIL = "owner@example.edu";

export function resolveOwnerAdminEmail(
	envValue: string | undefined = typeof import.meta !== "undefined"
		? (import.meta.env?.PUBLIC_OWNER_ADMIN_EMAIL as string | undefined)
		: undefined
): string {
	return requireOwnerAdminEmail(envValue ?? DEFAULT_OWNER_ADMIN_EMAIL);
}
