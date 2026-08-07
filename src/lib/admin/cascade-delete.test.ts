import { beforeEach, describe, expect, it } from "vitest";
import { MemoryAdminData } from "./memory-admin-data.js";
import type { AdminData, AdminDeleteImpact } from "./types.js";
import { cascadeFixtureResources } from "./test/cascade-fixtures.js";

function createCascadeData(): AdminData {
	return new MemoryAdminData({ resources: cascadeFixtureResources });
}

describe("cascade delete inspectRemove / remove (unit)", () => {
	let data: AdminData;

	beforeEach(() => {
		data = createCascadeData();
	});

	async function seedFacultyTree() {
		await data.create("Faculty", { id: "fac-1", name: "Ada" });
		await data.create("Faculty", { id: "fac-2", name: "Grace" });
		await data.create("SabbaticalCredit", {
			id: "sc-1",
			facultyId: "fac-1",
			sharedWithFacultyId: null,
			year: 2024
		});
		await data.create("SabbaticalCredit", {
			id: "sc-2",
			facultyId: "fac-1",
			sharedWithFacultyId: null,
			year: 2025
		});
		await data.create("SabbaticalCredit", {
			id: "sc-other",
			facultyId: "fac-2",
			sharedWithFacultyId: null,
			year: 2024
		});
	}

	it("CD1 parent with no children can delete with empty impact", async () => {
		await data.create("Faculty", { id: "fac-empty", name: "Lonely" });
		const impact = await data.inspectRemove("Faculty", "fac-empty");
		expect(impact).toEqual({
			resource: "Faculty",
			id: "fac-empty",
			blocking: [],
			cascading: [],
			canDelete: true
		} satisfies AdminDeleteImpact);
		await data.remove("Faculty", "fac-empty");
		expect(await data.get("Faculty", "fac-empty")).toBeNull();
	});

	it("CD2 parent with exclusive cascade children previews cascading counts", async () => {
		await seedFacultyTree();
		const impact = await data.inspectRemove("Faculty", "fac-1");
		expect(impact.canDelete).toBe(true);
		expect(impact.blocking).toEqual([]);
		expect(impact.cascading).toEqual([
			{
				resource: "SabbaticalCredit",
				foreignKey: "facultyId",
				policy: "cascade",
				count: 2,
				sampleIds: ["sc-1", "sc-2"]
			}
		]);
	});

	it("CD3 remove cascades exclusive children and leaves other parents untouched", async () => {
		await seedFacultyTree();
		await data.remove("Faculty", "fac-1");
		expect(await data.get("Faculty", "fac-1")).toBeNull();
		expect(await data.get("SabbaticalCredit", "sc-1")).toBeNull();
		expect(await data.get("SabbaticalCredit", "sc-2")).toBeNull();
		expect(await data.get("Faculty", "fac-2")).toMatchObject({ name: "Grace" });
		expect(await data.get("SabbaticalCredit", "sc-other")).toMatchObject({ facultyId: "fac-2" });
	});

	it("CD4 restrict children block inspect and remove without mutating", async () => {
		await data.create("Faculty", { id: "fac-1", name: "Ada" });
		await data.create("ResearchGrant", { id: "rg-1", facultyId: "fac-1", title: "NSF" });
		const impact = await data.inspectRemove("Faculty", "fac-1");
		expect(impact.canDelete).toBe(false);
		expect(impact.cascading).toEqual([]);
		expect(impact.blocking).toEqual([
			{
				resource: "ResearchGrant",
				foreignKey: "facultyId",
				policy: "restrict",
				count: 1,
				sampleIds: ["rg-1"]
			}
		]);
		await expect(data.remove("Faculty", "fac-1")).rejects.toMatchObject({
			kind: "conflict",
			status: 409
		});
		expect(await data.get("Faculty", "fac-1")).not.toBeNull();
		expect(await data.get("ResearchGrant", "rg-1")).not.toBeNull();
	});

	it("CD5 shared cascade child (secondary parent FK set) blocks delete", async () => {
		await data.create("Faculty", { id: "fac-1", name: "Ada" });
		await data.create("Faculty", { id: "fac-2", name: "Grace" });
		await data.create("SabbaticalCredit", {
			id: "sc-shared",
			facultyId: "fac-1",
			sharedWithFacultyId: "fac-2",
			year: 2026
		});
		const impact = await data.inspectRemove("Faculty", "fac-1");
		expect(impact.canDelete).toBe(false);
		expect(impact.cascading).toEqual([]);
		expect(impact.blocking).toEqual([
			{
				resource: "SabbaticalCredit",
				foreignKey: "facultyId",
				policy: "cascade",
				count: 1,
				sampleIds: ["sc-shared"],
				reason: "shared"
			}
		]);
		await expect(data.remove("Faculty", "fac-1")).rejects.toMatchObject({ kind: "conflict" });
		expect(await data.get("Faculty", "fac-1")).not.toBeNull();
		expect(await data.get("SabbaticalCredit", "sc-shared")).not.toBeNull();
	});

	it("CD6 mixed exclusive and shared children is atomic failure", async () => {
		await data.create("Faculty", { id: "fac-1", name: "Ada" });
		await data.create("Faculty", { id: "fac-2", name: "Grace" });
		await data.create("SabbaticalCredit", {
			id: "sc-ok",
			facultyId: "fac-1",
			sharedWithFacultyId: null,
			year: 2024
		});
		await data.create("SabbaticalCredit", {
			id: "sc-shared",
			facultyId: "fac-1",
			sharedWithFacultyId: "fac-2",
			year: 2025
		});
		const impact = await data.inspectRemove("Faculty", "fac-1");
		expect(impact.canDelete).toBe(false);
		expect(impact.blocking.some((b) => b.sampleIds.includes("sc-shared"))).toBe(true);
		await expect(data.remove("Faculty", "fac-1")).rejects.toMatchObject({ kind: "conflict" });
		expect(await data.get("SabbaticalCredit", "sc-ok")).not.toBeNull();
		expect(await data.get("SabbaticalCredit", "sc-shared")).not.toBeNull();
		expect(await data.get("Faculty", "fac-1")).not.toBeNull();
	});

	it("CD7 empty-string shared FK is treated as exclusive (not shared)", async () => {
		await data.create("Faculty", { id: "fac-1", name: "Ada" });
		await data.create("SabbaticalCredit", {
			id: "sc-blank",
			facultyId: "fac-1",
			sharedWithFacultyId: "",
			year: 2024
		});
		const impact = await data.inspectRemove("Faculty", "fac-1");
		expect(impact.canDelete).toBe(true);
		expect(impact.cascading[0]?.count).toBe(1);
		await data.remove("Faculty", "fac-1");
		expect(await data.get("SabbaticalCredit", "sc-blank")).toBeNull();
	});

	it("CD8 shared FK equal to the parent being deleted does not block", async () => {
		await data.create("Faculty", { id: "fac-1", name: "Ada" });
		await data.create("SabbaticalCredit", {
			id: "sc-self",
			facultyId: "fac-1",
			sharedWithFacultyId: "fac-1",
			year: 2024
		});
		const impact = await data.inspectRemove("Faculty", "fac-1");
		expect(impact.canDelete).toBe(true);
		await data.remove("Faculty", "fac-1");
		expect(await data.get("SabbaticalCredit", "sc-self")).toBeNull();
	});

	it("CD9 declared cascade edge with zero matching rows behaves like no children", async () => {
		await data.create("Faculty", { id: "fac-1", name: "Ada" });
		await data.create("SabbaticalCredit", {
			id: "sc-other",
			facultyId: "fac-2-missing-parent-seed",
			sharedWithFacultyId: null,
			year: 2024
		});
		const impact = await data.inspectRemove("Faculty", "fac-1");
		expect(impact).toMatchObject({ canDelete: true, cascading: [], blocking: [] });
	});

	it("CD10 nested cascade deletes grandchildren then children then parent", async () => {
		await data.create("Department", { id: "dept-1", name: "CS" });
		await data.create("CourseSection", { id: "sec-1", departmentId: "dept-1", code: "COMP 100" });
		await data.create("Enrollment", { id: "enr-1", sectionId: "sec-1", studentName: "Pat" });
		await data.create("Enrollment", { id: "enr-2", sectionId: "sec-1", studentName: "Sam" });
		const impact = await data.inspectRemove("Department", "dept-1");
		expect(impact.canDelete).toBe(true);
		expect(impact.cascading.map((c) => c.resource).sort()).toEqual(["CourseSection", "Enrollment"]);
		expect(impact.cascading.find((c) => c.resource === "Enrollment")?.count).toBe(2);
		await data.remove("Department", "dept-1");
		expect(await data.get("Department", "dept-1")).toBeNull();
		expect(await data.get("CourseSection", "sec-1")).toBeNull();
		expect(await data.get("Enrollment", "enr-1")).toBeNull();
		expect(await data.get("Enrollment", "enr-2")).toBeNull();
	});

	it("CD11 inspectRemove / remove missing parent is not_found", async () => {
		await expect(data.inspectRemove("Faculty", "missing")).rejects.toMatchObject({
			kind: "not_found"
		});
		await expect(data.remove("Faculty", "missing")).rejects.toMatchObject({ kind: "not_found" });
	});

	it("CD12 cascade and restrict together: restrict wins even with cascade kids", async () => {
		await data.create("Faculty", { id: "fac-1", name: "Ada" });
		await data.create("SabbaticalCredit", {
			id: "sc-1",
			facultyId: "fac-1",
			sharedWithFacultyId: null,
			year: 2024
		});
		await data.create("ResearchGrant", { id: "rg-1", facultyId: "fac-1", title: "NIH" });
		const impact = await data.inspectRemove("Faculty", "fac-1");
		expect(impact.canDelete).toBe(false);
		expect(impact.cascading[0]?.resource).toBe("SabbaticalCredit");
		expect(impact.blocking[0]?.resource).toBe("ResearchGrant");
		await expect(data.remove("Faculty", "fac-1")).rejects.toMatchObject({ kind: "conflict" });
		expect(await data.get("SabbaticalCredit", "sc-1")).not.toBeNull();
	});

	it("CD13 sampleIds are capped for large child sets", async () => {
		await data.create("Faculty", { id: "fac-1", name: "Ada" });
		for (let i = 0; i < 12; i++) {
			await data.create("SabbaticalCredit", {
				id: `sc-${i}`,
				facultyId: "fac-1",
				sharedWithFacultyId: null,
				year: 2000 + i
			});
		}
		const impact = await data.inspectRemove("Faculty", "fac-1");
		expect(impact.cascading[0]?.count).toBe(12);
		expect(impact.cascading[0]?.sampleIds.length).toBeLessThanOrEqual(5);
	});

	it("CD14 conflict message mentions blocking resources", async () => {
		await data.create("Faculty", { id: "fac-1", name: "Ada" });
		await data.create("ResearchGrant", { id: "rg-1", facultyId: "fac-1", title: "NIH" });
		await expect(data.remove("Faculty", "fac-1")).rejects.toThrow(/ResearchGrant|research grant/i);
	});

	it("CD15 resource without children metadata still deletes leaf records", async () => {
		await data.create("ResearchGrant", { id: "rg-1", facultyId: "fac-x", title: "Solo" });
		const impact = await data.inspectRemove("ResearchGrant", "rg-1");
		expect(impact.canDelete).toBe(true);
		await data.remove("ResearchGrant", "rg-1");
		expect(await data.get("ResearchGrant", "rg-1")).toBeNull();
	});
});
