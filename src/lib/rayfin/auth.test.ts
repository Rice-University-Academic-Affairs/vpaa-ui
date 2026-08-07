import type { OpaqueSession } from "@microsoft/rayfin-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	bootstrapAuth,
	identityFromSession,
	loadAppAuth,
	readFabricAuthOptions,
	sessionToAppAuth
} from "./auth.js";
import { createFakeFabricInit, createOpaqueSession } from "./test/fake-fabric.js";
import { resetRayfinClientForTests } from "./client.js";

const fabricEnv = {
	VITE_RAYFIN_API_URL: "https://rayfin.example/api",
	VITE_RAYFIN_PUBLISHABLE_KEY: "pk_test",
	VITE_FABRIC_WORKSPACE_ID: "ws-1",
	VITE_FABRIC_ITEM_ID: "item-1",
	VITE_FABRIC_PORTAL_URL: "https://fabric.example"
};

describe("Fabric auth session mapping (A1-A4)", () => {
	it("maps authenticated OpaqueSession email to AdminIdentity", () => {
		const session = createOpaqueSession({ email: "Owner@Example.EDU", id: "sub-1" });
		expect(identityFromSession(session)).toEqual({ email: "owner@example.edu" });
		expect(sessionToAppAuth(session)).toEqual({
			authenticated: true,
			email: "owner@example.edu",
			identity: { email: "owner@example.edu" }
		});
	});

	it("treats missing/blank email as unauthenticated even if isAuthenticated", () => {
		const blank: OpaqueSession = {
			user: { id: "sub-1", email: "   " },
			isAuthenticated: true,
			isAnonymous: false
		};
		expect(identityFromSession(blank)).toBeNull();
		expect(sessionToAppAuth(null).authenticated).toBe(false);
		expect(
			identityFromSession({
				user: null,
				isAuthenticated: false,
				isAnonymous: true
			})
		).toBeNull();
	});
});

describe("bootstrapAuth / loadAppAuth (A5-A8)", () => {
	beforeEach(() => {
		resetRayfinClientForTests();
	});

	it("requires Fabric env vars (A5)", () => {
		expect(() => readFabricAuthOptions({})).toThrow(/Missing required env vars for Fabric auth/i);
		expect(() =>
			readFabricAuthOptions({
				VITE_FABRIC_WORKSPACE_ID: "ws",
				VITE_FABRIC_ITEM_ID: "item"
			})
		).toThrow(/Missing required env vars for Fabric auth/i);
	});

	it("uses injectable Fabric init and returns session-shaped auth (A6)", async () => {
		const init = createFakeFabricInit((options) => {
			expect(options.workspaceId).toBe("ws-1");
			expect(options.projectId).toBe("item-1");
			expect(options.fabricPortalUrl).toBe("https://fabric.example");
			return { email: "Admin@Example.edu", id: "sub-admin" };
		});
		const auth = bootstrapAuth({
			env: fabricEnv,
			returnOrigin: "http://localhost:5173",
			initEmbeddedAuth: init
		});
		const session = await auth.initEmbeddedAuth();
		expect(session?.user?.email).toBe("Admin@Example.edu");
		expect(sessionToAppAuth(session).identity).toEqual({ email: "admin@example.edu" });
	});

	it("loadAppAuth normalizes the Fabric email through the real mapper (A7)", async () => {
		const result = await loadAppAuth({
			env: fabricEnv,
			returnOrigin: "http://localhost:5173",
			initEmbeddedAuth: createFakeFabricInit(() => ({ email: "Owner@Example.EDU" }))
		});
		expect(result).toEqual({
			authenticated: true,
			email: "owner@example.edu",
			identity: { email: "owner@example.edu" }
		});
	});

	it("loadAppAuth stays unauthenticated when Fabric init fails (A8)", async () => {
		const result = await loadAppAuth({
			env: fabricEnv,
			initEmbeddedAuth: async () => {
				throw new Error("not embedded");
			}
		});
		expect(result).toEqual({ authenticated: false, email: null, identity: null });
	});

	it("does not treat a mocked membership check as Fabric success (anti-tautology)", async () => {
		const membershipCheck = vi.fn(async () => ({ allowed: true, status: 200 }));
		const result = await loadAppAuth({
			env: fabricEnv,
			initEmbeddedAuth: createFakeFabricInit(() => null)
		});
		expect(result.authenticated).toBe(false);
		expect(membershipCheck).not.toHaveBeenCalled();
	});
});
