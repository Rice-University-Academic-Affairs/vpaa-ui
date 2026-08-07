import type { OpaqueSession } from "@microsoft/rayfin-auth";
import type { FabricAuthOptions } from "@microsoft/rayfin-auth-provider-fabric";
import type { FabricEmbeddedInit } from "./auth.js";

export type FakeFabricUser = {
	email: string;
	id?: string;
	authenticated?: boolean;
};

export function createOpaqueSession(user: FakeFabricUser | null): OpaqueSession {
	if (!user || user.authenticated === false) {
		return {
			user: null,
			isAuthenticated: false,
			isAnonymous: true
		};
	}
	return {
		user: {
			id: user.id ?? `sub:${user.email}`,
			email: user.email
		},
		isAuthenticated: true,
		isAnonymous: false,
		role: "Authenticated"
	};
}

export function createFakeFabricInit(handler: (options: FabricAuthOptions) => FakeFabricUser | null): FabricEmbeddedInit {
	return async (_auth, options) => createOpaqueSession(handler(options));
}
