import { AdminError, type AdminErrorKind } from "./types.js";

export type UiErrorState = {
	kind: AdminErrorKind | "empty";
	title: string;
	message: string;
	fields?: Record<string, string>;
};

export function mapAdminError(error: unknown): UiErrorState {
	if (error instanceof AdminError) {
		const titles: Record<AdminErrorKind, string> = {
			validation: "Validation error",
			forbidden: "Forbidden",
			not_found: "Not found",
			conflict: "Conflict",
			unauthorized: "Sign in required",
			unexpected: "Something went wrong"
		};
		return {
			kind: error.kind,
			title: titles[error.kind],
			message: error.message,
			fields: error.fields
		};
	}

	if (error && typeof error === "object") {
		const status = "status" in error ? Number((error as { status?: number }).status) : undefined;
		const message =
			"message" in error && typeof (error as { message?: unknown }).message === "string"
				? (error as { message: string }).message
				: "Unexpected error";
		if (status === 401) return { kind: "unauthorized", title: "Sign in required", message };
		if (status === 403) return { kind: "forbidden", title: "Forbidden", message };
		if (status === 404) return { kind: "not_found", title: "Not found", message };
		if (status === 409) return { kind: "conflict", title: "Conflict", message };
		if (status === 400) return { kind: "validation", title: "Validation error", message };
	}

	return {
		kind: "unexpected",
		title: "Something went wrong",
		message: error instanceof Error ? error.message : "Unexpected error"
	};
}
