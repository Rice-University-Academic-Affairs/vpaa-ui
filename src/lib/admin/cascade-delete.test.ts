import { beforeEach, describe, expect, it } from "vitest";
import { MemoryAdminData } from "./memory-admin-data.js";
import type { AdminData, AdminDeleteImpact, AdminRecord } from "./types.js";
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

	it("CD16 mentor-only faculty is blocked by sharedWithFacultyId restrict edge", async () => {
		await data.create("Faculty", { id: "fac-owner", name: "Ada" });
		await data.create("Faculty", { id: "fac-mentor", name: "Grace" });
		await data.create("SabbaticalCredit", {
			id: "sc-mentored",
			facultyId: "fac-owner",
			sharedWithFacultyId: "fac-mentor",
			year: 2026
		});
		const impact = await data.inspectRemove("Faculty", "fac-mentor");
		expect(impact.canDelete).toBe(false);
		expect(impact.blocking).toEqual([
			{
				resource: "SabbaticalCredit",
				foreignKey: "sharedWithFacultyId",
				policy: "restrict",
				count: 1,
				sampleIds: ["sc-mentored"]
			}
		]);
		await expect(data.remove("Faculty", "fac-mentor")).rejects.toMatchObject({ kind: "conflict" });
		expect(await data.get("SabbaticalCredit", "sc-mentored")).not.toBeNull();
		expect(await data.get("Faculty", "fac-mentor")).not.toBeNull();
	});

	it("CD17 unrelated userId does not mark exclusive cascade child as shared", async () => {
		await data.create("Faculty", { id: "fac-1", name: "Ada" });
		await data.create("SabbaticalCredit", {
			id: "sc-user",
			facultyId: "fac-1",
			sharedWithFacultyId: null,
			userId: "user-other",
			year: 2024
		});
		const impact = await data.inspectRemove("Faculty", "fac-1");
		expect(impact.canDelete).toBe(true);
		expect(impact.blocking).toEqual([]);
		expect(impact.cascading[0]?.count).toBe(1);
		await data.remove("Faculty", "fac-1");
		expect(await data.get("SabbaticalCredit", "sc-user")).toBeNull();
	});

	it("CD18 diamond cascade counts each leaf once", async () => {
		await data.create("DiamondRoot", { id: "root-1", name: "R" });
		await data.create("DiamondLeft", { id: "left-1", rootId: "root-1" });
		await data.create("DiamondRight", { id: "right-1", rootId: "root-1" });
		await data.create("DiamondLeaf", { id: "leaf-1", leftId: "left-1", rightId: "right-1" });
		const impact = await data.inspectRemove("DiamondRoot", "root-1");
		expect(impact.canDelete).toBe(true);
		const leafBuckets = impact.cascading.filter((bucket) => bucket.resource === "DiamondLeaf");
		expect(leafBuckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(1);
		await data.remove("DiamondRoot", "root-1");
		expect(await data.get("DiamondLeaf", "leaf-1")).toBeNull();
		expect(await data.get("DiamondLeft", "left-1")).toBeNull();
		expect(await data.get("DiamondRight", "right-1")).toBeNull();
	});

	it("CD19 deleting one diamond parent blocks when leaf is shared with the other", async () => {
		await data.create("DiamondRoot", { id: "root-1", name: "R" });
		await data.create("DiamondLeft", { id: "left-1", rootId: "root-1" });
		await data.create("DiamondRight", { id: "right-1", rootId: "root-1" });
		await data.create("DiamondLeaf", { id: "leaf-1", leftId: "left-1", rightId: "right-1" });
		const impact = await data.inspectRemove("DiamondLeft", "left-1");
		expect(impact.canDelete).toBe(false);
		expect(impact.blocking.some((bucket) => bucket.reason === "shared")).toBe(true);
		await expect(data.remove("DiamondLeft", "left-1")).rejects.toMatchObject({ kind: "conflict" });
		expect(await data.get("DiamondLeaf", "leaf-1")).not.toBeNull();
		expect(await data.get("DiamondLeft", "left-1")).not.toBeNull();
		expect(await data.get("DiamondRight", "right-1")).not.toBeNull();
	});

	it("CD22 org delete cascades team link shared across doomed sibling teams", async () => {
		await data.create("Org", { id: "org-1", name: "Rice" });
		await data.create("Team", { id: "team-a", orgId: "org-1", name: "A" });
		await data.create("Team", { id: "team-b", orgId: "org-1", name: "B" });
		await data.create("TeamLink", { id: "link-1", teamId: "team-a", otherTeamId: "team-b" });
		const impact = await data.inspectRemove("Org", "org-1");
		expect(impact.canDelete).toBe(true);
		expect(impact.blocking).toEqual([]);
		await data.remove("Org", "org-1");
		expect(await data.get("Org", "org-1")).toBeNull();
		expect(await data.get("Team", "team-a")).toBeNull();
		expect(await data.get("Team", "team-b")).toBeNull();
		expect(await data.get("TeamLink", "link-1")).toBeNull();
	});
});

describe("cascade delete TOCTOU guards", () => {
	it("CD20 remove aborts if exclusive child becomes shared after inspect", async () => {
		const { computeDeleteImpact, performCascadeRemove } = await import("./cascade-delete.js");
		const resources = cascadeFixtureResources;
		const faculty = new Map<string, AdminRecord>([
			["fac-1", { id: "fac-1", name: "Ada" }],
			["fac-2", { id: "fac-2", name: "Grace" }]
		]);
		const credits = new Map<string, AdminRecord>([
			["sc-1", { id: "sc-1", facultyId: "fac-1", sharedWithFacultyId: null, year: 2024 }]
		]);
		let mutateOnRead = false;
		const store = {
			get: async (resource: string, id: string) => {
				const bucket = resource === "Faculty" ? faculty : credits;
				const row = bucket.get(id);
				return row ? { ...row } : null;
			},
			listAll: async (resource: string) => {
				if (resource === "SabbaticalCredit" && mutateOnRead) {
					credits.set("sc-1", {
						id: "sc-1",
						facultyId: "fac-1",
						sharedWithFacultyId: "fac-2",
						year: 2024
					});
				}
				const bucket =
					resource === "Faculty" ? faculty : resource === "SabbaticalCredit" ? credits : new Map();
				return [...bucket.values()].map((row) => ({ ...row }));
			},
			deleteOne: async (resource: string, id: string) => {
				const bucket = resource === "Faculty" ? faculty : credits;
				bucket.delete(id);
			}
		};
		const impact = await computeDeleteImpact(resources, store, "Faculty", "fac-1");
		expect(impact.canDelete).toBe(true);
		mutateOnRead = true;
		await expect(performCascadeRemove(resources, store, "Faculty", "fac-1")).rejects.toMatchObject({
			kind: "conflict"
		});
		expect(faculty.has("fac-1")).toBe(true);
		expect(credits.has("sc-1")).toBe(true);
	});

	it("CD21 remove aborts if restrict child appears after inspect", async () => {
		const { computeDeleteImpact, performCascadeRemove } = await import("./cascade-delete.js");
		const resources = cascadeFixtureResources;
		const faculty = new Map<string, AdminRecord>([["fac-1", { id: "fac-1", name: "Ada" }]]);
		const grants = new Map<string, AdminRecord>();
		let mutateOnRead = false;
		const store = {
			get: async (resource: string, id: string) => {
				if (resource === "Faculty") return faculty.get(id) ? { ...faculty.get(id)! } : null;
				if (resource === "ResearchGrant") return grants.get(id) ? { ...grants.get(id)! } : null;
				return null;
			},
			listAll: async (resource: string) => {
				if (resource === "ResearchGrant" && mutateOnRead) {
					grants.set("rg-1", { id: "rg-1", facultyId: "fac-1", title: "Late" });
				}
				if (resource === "ResearchGrant") return [...grants.values()].map((row) => ({ ...row }));
				if (resource === "SabbaticalCredit") return [];
				return [];
			},
			deleteOne: async (resource: string, id: string) => {
				if (resource === "Faculty") faculty.delete(id);
				if (resource === "ResearchGrant") grants.delete(id);
			}
		};
		const impact = await computeDeleteImpact(resources, store, "Faculty", "fac-1");
		expect(impact.canDelete).toBe(true);
		mutateOnRead = true;
		await expect(performCascadeRemove(resources, store, "Faculty", "fac-1")).rejects.toMatchObject({
			kind: "conflict"
		});
		expect(faculty.has("fac-1")).toBe(true);
	});
});
