export type DeleteInspectGate = {
	begin(): number;
	invalidate(): void;
	isCurrent(token: number): boolean;
};

export function createDeleteInspectGate(): DeleteInspectGate {
	let generation = 0;
	return {
		begin() {
			return ++generation;
		},
		invalidate() {
			generation += 1;
		},
		isCurrent(token: number) {
			return token === generation;
		}
	};
}

export function canConfirmAdminDelete(
	inspecting: boolean,
	impact: { canDelete: boolean } | null
): boolean {
	return !inspecting && (impact === null || impact.canDelete);
}
