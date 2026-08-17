import { describe, expect, it } from "vitest";
import { advanceListPage } from "./list-paging.js";

describe("advanceListPage", () => {
	it("P1 refuses to advance without endCursor", () => {
		expect(
			advanceListPage({
				pageIndex: 0,
				cursorStack: [null],
				hasNextPage: true,
				endCursor: undefined
			})
		).toBeNull();
	});

	it("P2 appends endCursor at the frontier", () => {
		expect(
			advanceListPage({
				pageIndex: 0,
				cursorStack: [null],
				hasNextPage: true,
				endCursor: "c1"
			})
		).toEqual({ pageIndex: 1, cursorStack: [null, "c1"] });
	});

	it("P3 ignores double-next with the same stale endCursor", () => {
		const first = advanceListPage({
			pageIndex: 0,
			cursorStack: [null],
			hasNextPage: true,
			endCursor: "c1"
		});
		expect(first).not.toBeNull();
		expect(
			advanceListPage({
				pageIndex: first!.pageIndex,
				cursorStack: first!.cursorStack,
				hasNextPage: true,
				endCursor: "c1"
			})
		).toBeNull();
	});
});
