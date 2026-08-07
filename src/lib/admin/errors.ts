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
			message:
				error.kind === "unexpected" ? "Something went wrong. Please try again." : error.message,
			fields: error.fields
		};
	}

	if (error && typeof error === "object") {
		const status = "status" in error ? Number((error as { status?: number }).status) : undefined;
		const message =
			"message" in error && typeof (error as { message?: unknown }).message === "string"
				? (error as { message: string }).message
				: "Unexpected error";
		const lower = message.toLowerCase();
		if (status === 401 || lower.includes("unauthorized")) {
			return { kind: "unauthorized", title: "Sign in required", message: "Sign in required" };
		}
		if (status === 403 || lower.includes("forbidden") || lower.includes("permission")) {
			return { kind: "forbidden", title: "Forbidden", message: "This operation is not permitted." };
		}
		if (status === 404 || lower.includes("not found")) {
			return { kind: "not_found", title: "Not found", message: "The requested record was not found." };
		}
		if (status === 409) return { kind: "conflict", title: "Conflict", message };
		if (status === 400 || lower.includes("validation") || lower.includes("graphql errors")) {
			return { kind: "validation", title: "Validation error", message };
		}
	}

	return {
		kind: "unexpected",
		title: "Something went wrong",
		message: "Something went wrong. Please try again."
	};
}
