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

export function resolveOwnerAdminEmail(envValue?: string | undefined | null): string {
	const fromEnv =
		envValue ??
		(typeof import.meta !== "undefined"
			? ((import.meta.env?.PUBLIC_OWNER_ADMIN_EMAIL as string | undefined) ??
				(import.meta.env?.VITE_OWNER_ADMIN_EMAIL as string | undefined))
			: undefined);
	return requireOwnerAdminEmail(fromEnv);
}
